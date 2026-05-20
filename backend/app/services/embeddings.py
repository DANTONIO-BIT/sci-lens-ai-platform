"""
Embedding service — usa Jina AI (jina-embeddings-v3, 1024 dims).
1M tokens/mes gratis en https://jina.ai
Almacena vectores en Supabase via tabla paper_chunks.
"""
from __future__ import annotations
import httpx
from supabase import create_client, Client
from app.config import settings

JINA_EMBED_URL = "https://api.jina.ai/v1/embeddings"


def _get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Genera embeddings para una lista de textos via Jina AI."""
    if not texts:
        return []

    all_vectors: list[list[float]] = []
    batch_size = 50   # Jina recomienda batches <= 100 inputs

    async with httpx.AsyncClient(timeout=60.0) as client:
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            resp = await client.post(
                JINA_EMBED_URL,
                headers={
                    "Authorization": f"Bearer {settings.jina_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "input": batch,
                    "model": settings.embedding_model,
                    "dimensions": settings.embedding_dimensions,
                    "task": "retrieval.passage",   # optimiza para búsqueda semántica
                },
            )
            resp.raise_for_status()
            data = resp.json()
            all_vectors.extend(item["embedding"] for item in data["data"])

    return all_vectors


async def store_chunks(paper_id: str, chunks: list[str]) -> None:
    """Genera embeddings para los chunks y los guarda en Supabase."""
    if not chunks:
        return

    vectors = await embed_texts(chunks)
    supabase = _get_supabase()

    rows = [
        {
            "paper_id": paper_id,
            "chunk_index": idx,
            "chunk_text": text,
            "embedding": vector,
        }
        for idx, (text, vector) in enumerate(zip(chunks, vectors))
    ]

    batch_size = 50
    for i in range(0, len(rows), batch_size):
        supabase.table("paper_chunks").insert(rows[i : i + batch_size]).execute()


async def embed_query(text: str) -> list[float]:
    """Genera un embedding optimizado para búsqueda (task=retrieval.query)."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            JINA_EMBED_URL,
            headers={
                "Authorization": f"Bearer {settings.jina_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "input": [text],
                "model": settings.embedding_model,
                "dimensions": settings.embedding_dimensions,
                "task": "retrieval.query",
            },
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["embedding"]


async def find_similar_papers(
    paper_id: str,
    user_id: str,
    top_k: int = 5,
) -> list[dict]:
    """
    Busca papers semánticamente similares via pgvector (cosine similarity).
    Usa el embedding promedio de los primeros 3 chunks del paper.
    """
    import json as _json

    supabase = _get_supabase()

    chunks_resp = (
        supabase.table("paper_chunks")
        .select("embedding")
        .eq("paper_id", paper_id)
        .limit(3)
        .execute()
    )
    if not chunks_resp.data:
        return []

    # Supabase/pgvector can return vectors as JSON strings — parse defensively
    vectors: list[list[float]] = []
    for row in chunks_resp.data:
        emb = row.get("embedding")
        if emb is None:
            continue
        if isinstance(emb, str):
            try:
                emb = _json.loads(emb)
            except Exception:
                continue
        if isinstance(emb, list) and emb:
            vectors.append([float(x) for x in emb])

    if not vectors:
        return []

    n = len(vectors[0])
    avg_vector = [sum(v[i] for v in vectors) / len(vectors) for i in range(n)]

    try:
        result = supabase.rpc(
            "match_paper_chunks",
            {
                "query_embedding": avg_vector,
                "match_user_id": user_id,
                "exclude_paper_id": paper_id,
                "match_count": top_k,
            },
        ).execute()
        return result.data or []
    except Exception:
        return []
