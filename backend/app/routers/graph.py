"""
Graph router — returns nodes and links for the Research Graph visualization.
Uses two-query approach (papers + analysis separately) for reliability.
"""
from __future__ import annotations
from fastapi import APIRouter, HTTPException, Header
from supabase import create_client

from app.config import settings

router = APIRouter(prefix="/graph", tags=["graph"])

DOMAIN_COLORS = {
    "pharma_clinical": "#6366f1",
    "pharma_industrial": "#3b82f6",
    "biotech": "#22c55e",
    "medical_device": "#06b6d4",
    "chemicals": "#f59e0b",
    "agro_health": "#84cc16",
    "academic_basic": "#94a3b8",
}


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


@router.get("/")
async def get_graph(authorization: str | None = Header(default=None)):
    """
    Return graph nodes (papers) and links (semantic connections) for the user.
    Domain from raw_json is used for cluster coloring.
    """
    user_id = _get_user_id(authorization)
    sb = _supabase()

    # Fetch analyzed papers
    papers_resp = (
        sb.table("papers")
        .select("id, title, status")
        .eq("user_id", user_id)
        .eq("status", "analyzed")
        .execute()
    )
    papers = papers_resp.data or []

    paper_ids = [p["id"] for p in papers]
    if not paper_ids:
        return {"nodes": [], "links": []}

    # Fetch analyses for domain/tag info
    analyses_resp = (
        sb.table("paper_analysis")
        .select("paper_id, raw_json, trl_level")
        .in_("paper_id", paper_ids)
        .execute()
    )
    analysis_map: dict[str, dict] = {}
    for a in analyses_resp.data or []:
        analysis_map[a["paper_id"]] = a.get("raw_json") or {}

    # Fetch connections
    connections_resp = (
        sb.table("paper_connections")
        .select("paper_id_a, paper_id_b, similarity")
        .eq("user_id", user_id)
        .execute()
    )
    connection_map: dict[str, list[str]] = {pid: [] for pid in paper_ids}
    links = []
    for c in (connections_resp.data or []):
        a_id = c["paper_id_a"]
        b_id = c["paper_id_b"]
        if a_id in connection_map:
            connection_map[a_id].append(b_id)
        if b_id in connection_map:
            connection_map[b_id].append(a_id)
        links.append({
            "source": a_id,
            "target": b_id,
            "strength": round(c.get("similarity", 0.0), 3),
            "type": "semantic",
        })

    # Build nodes
    nodes = []
    for paper in papers:
        pid = paper["id"]
        raw = analysis_map.get(pid, {})
        trl = raw.get("trl_score") or analysis_map.get(pid, {}).get("trl_level", 6)
        domain = raw.get("domain", "academic_basic")
        tags: list[str] = raw.get("tags", [])
        cluster_name = tags[0] if tags else domain.replace("_", " ").title()
        cluster_color = DOMAIN_COLORS.get(domain, "#94a3b8")

        nodes.append({
            "id": pid,
            "label": (paper.get("title") or "Untitled")[:40],
            "cluster": cluster_name,
            "clusterColor": cluster_color,
            "relevance": (trl or 6) * 10,
            "connections": connection_map.get(pid, []),
            "domain": domain,
            "trl": trl,
        })

    return {"nodes": nodes, "links": links}
