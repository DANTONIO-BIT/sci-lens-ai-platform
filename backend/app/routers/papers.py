"""
Papers router — upload, retrieve, list endpoints.
"""
from __future__ import annotations
import hashlib
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from supabase import create_client

from app.config import settings
from app.models.schemas import UploadResponse, PaperStatus
from app.services import pdf_parser, embeddings, llm_analyzer, entity_extractor
from app.services.enrichers import orchestrator as enricher
from app.services.scoring import trl as trl_scorer, market as market_scorer

router = APIRouter(prefix="/papers", tags=["papers"])

_sem = asyncio.Semaphore(2)

# A paper still "processing" after this long is an orphan (its background task
# died — OOM, restart, hang). Re-uploading it should replace it, not 409.
_ORPHAN_AFTER = timedelta(minutes=10)

# Hard ceiling for a single analysis. Stays under the frontend's ~6-min poll
# budget so a hung pipeline self-fails to 'failed' instead of orphaning.
_ANALYSIS_TIMEOUT_S = 300


def _supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _get_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        sb = create_client(settings.supabase_url, settings.supabase_service_role_key)
        user = sb.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _check_duplicate(sb, user_id: str, file_hash: str, doi: str | None) -> dict | None:
    """Find an existing paper for this user by file_hash or DOI (any status)."""
    # Check by file hash
    if file_hash:
        resp = (
            sb.table("papers")
            .select("id, title, status, created_at")
            .eq("user_id", user_id)
            .eq("file_hash", file_hash)
            .maybe_single()
            .execute()
        )
        if resp and resp.data:
            return resp.data

    # Check by DOI
    if doi:
        resp = (
            sb.table("papers")
            .select("id, title, status, created_at")
            .eq("user_id", user_id)
            .eq("doi", doi)
            .maybe_single()
            .execute()
        )
        if resp and resp.data:
            return resp.data

    return None


def _is_orphan_processing(row: dict) -> bool:
    """A 'processing' paper whose background task clearly died (stale)."""
    if row.get("status") != "processing":
        return False
    created = row.get("created_at")
    if not created:
        return True
    try:
        ts = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
    except ValueError:
        return True
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - ts > _ORPHAN_AFTER


def _purge_paper(sb, user_id: str, paper_id: str) -> None:
    """Delete a paper + its PDF. Row delete cascades to chunks/analysis/connections."""
    try:
        sb.storage.from_("papers").remove([f"{user_id}/{paper_id}.pdf"])
    except Exception:
        pass  # best-effort — a missing object must not block re-upload
    sb.table("papers").delete().eq("id", paper_id).eq("user_id", user_id).execute()


@router.post("/upload", response_model=UploadResponse)
async def upload_paper(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    max_bytes = settings.max_file_size_mb * 1024 * 1024
    pdf_bytes = await file.read()
    if len(pdf_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_file_size_mb}MB",
        )

    user_id = _get_user_id(authorization)
    sb = _supabase()

    # Calculate file hash for duplicate detection
    file_hash = hashlib.sha256(pdf_bytes).hexdigest()

    # Extract metadata to get DOI
    metadata = pdf_parser.extract_metadata(pdf_bytes)

    # Duplicate handling. A successfully 'analyzed' paper — or one that is
    # genuinely still processing — blocks re-upload. A 'failed' paper or a
    # stale 'processing' orphan is purged so the user can re-upload cleanly.
    existing = _check_duplicate(sb, user_id, file_hash, metadata.doi)
    if existing:
        status = existing.get("status")
        if status == "analyzed" or (status == "processing" and not _is_orphan_processing(existing)):
            raise HTTPException(
                status_code=409,
                detail={
                    "duplicate": True,
                    "existing_paper_id": existing["id"],
                    "title": existing["title"],
                },
            )
        _purge_paper(sb, user_id, existing["id"])

    paper_id = str(uuid.uuid4())

    # 1. Upload PDF to Supabase Storage
    storage_path = f"{user_id}/{paper_id}.pdf"
    sb.storage.from_("papers").upload(
        storage_path,
        pdf_bytes,
        {"content-type": "application/pdf"},
    )
    file_url = sb.storage.from_("papers").get_public_url(storage_path)

    # 2. Extract full text + sections
    full_text = pdf_parser.extract_full_text(pdf_bytes)
    sections = pdf_parser.extract_sections(full_text)
    priority_context = pdf_parser.build_priority_context(sections)

    # 3. Create paper record
    sb.table("papers").insert(
        {
            "id": paper_id,
            "user_id": user_id,
            "title": metadata.title,
            "authors": metadata.authors,
            "abstract": metadata.abstract,
            "journal": metadata.journal,
            "year": metadata.year,
            "doi": metadata.doi,
            "file_url": file_url,
            "file_name": file.filename,
            "file_hash": file_hash,
            "status": "processing",
        }
    ).execute()

    # 4. Background processing
    asyncio.create_task(
        _process_paper(paper_id, user_id, metadata, full_text, sections, priority_context)
    )

    return UploadResponse(
        paper_id=paper_id,
        status="processing",
        title=metadata.title,
        authors=metadata.authors,
    )


async def _process_paper(paper_id, user_id, metadata, full_text, sections, priority_context):
    sb = _supabase()

    async def db(fn):
        return await asyncio.to_thread(fn)

    async with _sem:
        async def _run():
            # Step 1: Chunk + embed (unchanged)
            chunks = pdf_parser.chunk_text(full_text)
            await embeddings.store_chunks(paper_id, chunks)

            # Step 2: Extract scientific entities from abstract
            entities = await entity_extractor.extract_entities(
                metadata.title, metadata.abstract
            )

            # Step 3: Enrich with external scientific APIs (parallel)
            enrichment = await enricher.enrich_paper(
                title=metadata.title,
                doi=metadata.doi,
                entities=entities,
            )

            # Step 4: Detect domain (small LLM call)
            domain = await llm_analyzer.detect_domain(
                metadata.abstract, priority_context
            )

            # Step 5: Compute data-driven scores from real enrichment data
            trl_context = trl_scorer.calculate_trl_context(enrichment)
            market_evidence = market_scorer.calculate_market_evidence(enrichment, domain)

            # Step 6: LLM synthesis — interprets paper + receives real data as context
            analysis = await llm_analyzer.analyze_paper(
                title=metadata.title,
                abstract=metadata.abstract,
                sections_text=priority_context,
                domain=domain,
                enrichment=enrichment,
                trl_context=trl_context,
                market_evidence=market_evidence,
            )

            # Step 7: Persist analysis
            await db(lambda: sb.table("paper_analysis").insert(
                {
                    "paper_id": paper_id,
                    "trl_level": analysis.trl_score,
                    "trl_confidence": analysis.trl_confidence,
                    "trl_description": analysis.trl_description,
                    "startup_score": analysis.novelty_score,
                    "market_opportunity": market_evidence.model_dump(),
                    "tam_estimate": str(market_evidence.market_validation_score),
                    "regulatory_complexity": analysis.risk_level,
                    "technical_barriers": analysis.trl_description,
                    "synthesis": analysis.synthesis,
                    "extracted_methods": analysis.extracted_methods,
                    "extracted_claims": analysis.extracted_claims,
                    "raw_json": {
                        **analysis.model_dump(exclude={"market_evidence", "enrichment"}),
                        "market_evidence": market_evidence.model_dump(),
                        "enrichment": enrichment.model_dump(),
                    },
                    "domain": analysis.domain,
                    "evidence_quality": analysis.evidence_quality.model_dump(),
                    "regulatory_pathway": analysis.regulatory_pathway,
                    "regulatory_timeline": analysis.regulatory_timeline,
                }
            ).execute())

            # Find similar papers
            similar = await embeddings.find_similar_papers(paper_id, user_id)
            for item in similar:
                try:
                    sid = item.get("paper_id")
                    sim = float(item.get("similarity", 0.0))
                    if sid and sim > 0.5:
                        await db(lambda s=sid, sm=sim: sb.table("paper_connections").upsert(
                            {
                                "paper_id_a": paper_id,
                                "paper_id_b": s,
                                "similarity": sm,
                                "user_id": user_id,
                            }
                        ).execute())
                except Exception:
                    pass

            await db(lambda: sb.table("papers").update({"status": "analyzed"}).eq("id", paper_id).execute())

        try:
            # Bound the whole pipeline so a hung step self-fails instead of
            # leaving the paper orphaned in 'processing' forever.
            await asyncio.wait_for(_run(), timeout=_ANALYSIS_TIMEOUT_S)
        except Exception as e:
            await asyncio.to_thread(
                lambda: sb.table("papers").update({"status": "failed"}).eq("id", paper_id).execute()
            )
            print(f"Error processing paper {paper_id}: {e}")


@router.get("/{paper_id}/status", response_model=PaperStatus)
async def get_paper_status(
    paper_id: str,
    authorization: str | None = Header(default=None),
):
    user_id = _get_user_id(authorization)
    sb = _supabase()
    resp = (
        sb.table("papers")
        .select("id, status, title")
        .eq("id", paper_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not resp or not resp.data:
        raise HTTPException(status_code=404, detail="Paper not found")
    d = resp.data
    return PaperStatus(paper_id=d["id"], status=d["status"], title=d.get("title"))


@router.get("/{paper_id}")
async def get_paper(
    paper_id: str,
    authorization: str | None = Header(default=None),
):
    user_id = _get_user_id(authorization)
    sb = _supabase()

    paper_resp = (
        sb.table("papers")
        .select("*")
        .eq("id", paper_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not paper_resp or not paper_resp.data:
        raise HTTPException(status_code=404, detail="Paper not found")

    analysis_resp = (
        sb.table("paper_analysis")
        .select("*")
        .eq("paper_id", paper_id)
        .maybe_single()
        .execute()
    )

    return {
        "paper": paper_resp.data,
        "analysis": analysis_resp.data,
    }


@router.get("/")
async def list_papers(authorization: str | None = Header(default=None)):
    user_id = _get_user_id(authorization)
    sb = _supabase()

    # Two-query approach: papers + analysis separately (more reliable than FK embed)
    papers_resp = (
        sb.table("papers")
        .select("id, title, authors, status, created_at, file_name")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    papers = papers_resp.data or []
    if not papers:
        return {"papers": []}

    paper_ids = [p["id"] for p in papers]
    analysis_resp = (
        sb.table("paper_analysis")
        .select("paper_id, trl_level, trl_confidence, tam_estimate, regulatory_complexity, raw_json")
        .in_("paper_id", paper_ids)
        .execute()
    )
    analysis_map = {a["paper_id"]: a for a in (analysis_resp.data or [])}

    for p in papers:
        p["analysis"] = analysis_map.get(p["id"])

    return {"papers": papers}
