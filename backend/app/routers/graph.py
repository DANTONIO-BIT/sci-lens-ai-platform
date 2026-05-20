"""
Graph router — returns nodes and links for the Research Graph visualization.
"""
from __future__ import annotations
from fastapi import APIRouter, HTTPException, Header
from supabase import create_client

from app.config import settings

router = APIRouter(prefix="/graph", tags=["graph"])

CLUSTER_COLORS = [
    "#10b981", "#6366f1", "#f59e0b", "#ec4899",
    "#8b5cf6", "#14b8a6", "#f97316", "#06b6d4",
]


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
    Tags are used to infer clusters; color assigned per unique tag cluster.
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

    # Fetch analyses for cluster/tag info
    paper_ids = [p["id"] for p in papers]
    if not paper_ids:
        return {"nodes": [], "links": []}

    analyses_resp = (
        sb.table("paper_analysis")
        .select("paper_id, raw_json")
        .in_("paper_id", paper_ids)
        .execute()
    )
    analysis_map: dict[str, dict] = {}
    for a in analyses_resp.data or []:
        analysis_map[a["paper_id"]] = a.get("raw_json") or {}

    # Build cluster mapping from tags
    cluster_map: dict[str, str] = {}
    color_idx = 0
    nodes = []
    for paper in papers:
        pid = paper["id"]
        raw = analysis_map.get(pid, {})
        tags: list[str] = raw.get("tags", [])
        primary_tag = tags[0] if tags else "General"

        if primary_tag not in cluster_map:
            cluster_map[primary_tag] = CLUSTER_COLORS[color_idx % len(CLUSTER_COLORS)]
            color_idx += 1

        nodes.append(
            {
                "id": pid,
                "label": (paper.get("title") or "Untitled")[:40],
                "cluster": primary_tag,
                "clusterColor": cluster_map[primary_tag],
                "relevance": raw.get("impact_score", 60),
                "connections": [],
            }
        )

    # Fetch connections
    connections_resp = (
        sb.table("paper_connections")
        .select("paper_id_a, paper_id_b, similarity")
        .eq("user_id", user_id)
        .execute()
    )
    links = [
        {
            "source": c["paper_id_a"],
            "target": c["paper_id_b"],
            "strength": round(c["similarity"], 3),
            "type": "semantic",
        }
        for c in (connections_resp.data or [])
    ]

    return {"nodes": nodes, "links": links}
