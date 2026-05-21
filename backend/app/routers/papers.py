"""
Papers router — upload, retrieve, list endpoints.
"""
from __future__ import annotations
import hashlib
import json
import uuid
import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from supabase import create_client

from app.config import settings
from app.models.schemas import UploadResponse, PaperStatus
from app.services import pdf_parser, embeddings, llm_analyzer

router = APIRouter(prefix="/papers", tags=["papers"])

_sem = asyncio.Semaphore(2)


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
    """Check if a paper with the same file_hash or DOI already exists for this user."""
    # Check by file hash
    if file_hash:
        resp = (
            sb.table("papers")
            .select("id, title")
            .eq("user_id", user_id)
            .eq("file_hash", file_hash)
            .maybe_single()
            .execute()
        )
        if resp.data:
            return resp.data

    # Check by DOI
    if doi:
        resp = (
            sb.table("papers")
            .select("id, title")
            .eq("user_id", user_id)
            .eq("doi", doi)
            .maybe_single()
            .execute()
        )
        if resp.data:
            return resp.data

    return None


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

    # Check for duplicates
    existing = _check_duplicate(sb, user_id, file_hash, metadata.doi)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=json.dumps({
                "duplicate": True,
                "existing_paper_id": existing["id"],
                "title": existing["title"],
            }),
        )

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
        try:
            # Chunk + embed
            chunks = pdf_parser.chunk_text(full_text)
            await embeddings.store_chunks(paper_id, chunks)

            # LLM analysis with section-prioritized context
            analysis = await llm_analyzer.analyze_paper(
                metadata.title, metadata.abstract, priority_context
            )

            # Save analysis
            await db(lambda: sb.table("paper_analysis").insert(
                {
                    "paper_id": paper_id,
                    "trl_level": analysis.trl_score,
                    "trl_confidence": analysis.trl_confidence,
                    "trl_description": analysis.trl_description,
                    "startup_score": analysis.novelty_score,
                    "market_opportunity": analysis.tam_estimate.model_dump_json(),
                    "tam_estimate": str(analysis.tam_estimate.value),
                    "regulatory_complexity": analysis.risk_level,
                    "technical_barriers": analysis.trl_description,
                    "synthesis": analysis.synthesis,
                    "extracted_methods": analysis.extracted_methods,
                    "extracted_claims": analysis.extracted_claims,
                    "raw_json": analysis.model_dump(),
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
        .single()
        .execute()
    )
    if not resp.data:
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
        .single()
        .execute()
    )
    if not paper_resp.data:
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
