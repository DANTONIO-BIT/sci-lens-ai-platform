"""
Papers router — upload, retrieve, list endpoints.
"""
from __future__ import annotations
import uuid
import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from supabase import create_client

from app.config import settings
from app.models.schemas import UploadResponse, PaperStatus
from app.services import pdf_parser, embeddings, llm_analyzer

router = APIRouter(prefix="/papers", tags=["papers"])


def _supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _get_user_id(authorization: str | None) -> str:
    """Extract user_id from Supabase JWT. Raises 401 if missing/invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        sb = create_client(settings.supabase_url, settings.supabase_service_role_key)
        user = sb.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/upload", response_model=UploadResponse)
async def upload_paper(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    """
    Upload a PDF, extract metadata, generate embeddings, and trigger analysis.
    Returns immediately with paper_id; analysis runs in the background.
    """
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
    paper_id = str(uuid.uuid4())
    sb = _supabase()

    # 1. Upload PDF to Supabase Storage
    storage_path = f"{user_id}/{paper_id}.pdf"
    sb.storage.from_("papers").upload(
        storage_path,
        pdf_bytes,
        {"content-type": "application/pdf"},
    )
    file_url = sb.storage.from_("papers").get_public_url(storage_path)

    # 2. Extract metadata
    metadata = pdf_parser.extract_metadata(pdf_bytes)
    full_text = pdf_parser.extract_full_text(pdf_bytes)

    # 3. Create paper record with status=processing
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
            "status": "processing",
        }
    ).execute()

    # 4. Run embedding + analysis in background (non-blocking)
    asyncio.create_task(
        _process_paper(paper_id, user_id, metadata, full_text, pdf_bytes)
    )

    return UploadResponse(
        paper_id=paper_id,
        status="processing",
        title=metadata.title,
        authors=metadata.authors,
    )


async def _process_paper(paper_id: str, user_id: str, metadata, full_text: str, pdf_bytes: bytes):
    """Background task: chunk, embed, analyze, save results."""
    sb = _supabase()
    try:
        # Chunk + embed
        chunks = pdf_parser.chunk_text(full_text)
        await embeddings.store_chunks(paper_id, chunks)

        # LLM analysis
        analysis = await llm_analyzer.analyze_paper(
            metadata.title, metadata.abstract, full_text
        )

        # Save analysis to DB
        sb.table("paper_analysis").insert(
            {
                "paper_id": paper_id,
                "trl_level": analysis.trl_score,
                "trl_confidence": analysis.trl_confidence,
                "trl_description": analysis.trl_description,
                "startup_score": analysis.novelty_score,  # proxy for startup score
                "market_opportunity": analysis.tam_estimate.model_dump_json(),
                "tam_estimate": str(analysis.tam_estimate.value),
                "regulatory_complexity": analysis.risk_level,
                "technical_barriers": analysis.trl_description,
                "synthesis": analysis.synthesis,
                "extracted_methods": analysis.extracted_methods,
                "extracted_claims": analysis.extracted_claims,
                "raw_json": analysis.model_dump(),
            }
        ).execute()

        # Find similar papers
        similar = await embeddings.find_similar_papers(paper_id, user_id)
        for item in similar:
            try:
                sid = item.get("paper_id")
                sim = item.get("similarity", 0.0)
                if sid and sim > 0.5:
                    sb.table("paper_connections").upsert(
                        {
                            "paper_id_a": paper_id,
                            "paper_id_b": sid,
                            "similarity": sim,
                            "user_id": user_id,
                        }
                    ).execute()
            except Exception:
                pass

        # Mark as analyzed
        sb.table("papers").update({"status": "analyzed"}).eq("id", paper_id).execute()

    except Exception as e:
        sb.table("papers").update({"status": "failed"}).eq("id", paper_id).execute()
        print(f"Error processing paper {paper_id}: {e}")


@router.get("/{paper_id}/status", response_model=PaperStatus)
async def get_paper_status(
    paper_id: str,
    authorization: str | None = Header(default=None),
):
    """Poll the processing status of a paper."""
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
    """Get full paper with analysis."""
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
    """List all papers for the authenticated user."""
    user_id = _get_user_id(authorization)
    sb = _supabase()

    papers_resp = (
        sb.table("papers")
        .select("id, title, authors, status, created_at, file_name")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"papers": papers_resp.data or []}
