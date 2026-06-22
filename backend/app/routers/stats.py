"""
Stats router — aggregated dashboard statistics for the user.
"""
from __future__ import annotations
from fastapi import APIRouter, Header
from supabase import create_client

from app.config import settings

router = APIRouter(prefix="/papers/stats", tags=["stats"])


def _supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _get_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        return ""
    token = authorization.split(" ", 1)[1]
    try:
        sb = create_client(settings.supabase_url, settings.supabase_service_role_key)
        user = sb.auth.get_user(token)
        return user.user.id
    except Exception:
        return ""


@router.get("/")
async def get_paper_stats(authorization: str | None = Header(default=None)):
    """Return aggregated statistics for the user's papers."""
    user_id = _get_user_id(authorization)
    if not user_id:
        return {
            "total_papers": 0,
            "analyzed_papers": 0,
            "avg_trl_score": 0,
            "avg_market_score": 0,
            "high_risk_count": 0,
            "domain_distribution": {},
            "evidence_distribution": {},
        }

    sb = _supabase()

    # Papers count
    papers_resp = sb.table("papers").select("id, status").eq("user_id", user_id).execute()
    papers = papers_resp.data or []
    total = len(papers)
    analyzed_ids = [p["id"] for p in papers if p.get("status") == "analyzed"]

    if not analyzed_ids:
        return {
            "total_papers": total,
            "analyzed_papers": 0,
            "avg_trl_score": 0,
            "avg_market_score": 0,
            "high_risk_count": 0,
            "domain_distribution": {},
            "evidence_distribution": {},
        }

    # Analysis data
    analyses_resp = (
        sb.table("paper_analysis")
        .select("trl_level, tam_estimate, regulatory_complexity, raw_json")
        .in_("paper_id", analyzed_ids)
        .execute()
    )
    analyses = analyses_resp.data or []

    trl_scores = [a.get("trl_level") for a in analyses if a.get("trl_level")]
    avg_trl = round(sum(trl_scores) / len(trl_scores), 1) if trl_scores else 0

    # Average market validation score (0-100) from real enrichment data.
    market_scores: list[float] = []
    for a in analyses:
        raw = a.get("raw_json") or {}
        me = raw.get("market_evidence", {})
        score = me.get("market_validation_score") if isinstance(me, dict) else None
        if score is None:
            # Fallback to the tam_estimate column (stores the score as a string)
            try:
                score = float(a.get("tam_estimate") or 0)
            except (ValueError, TypeError):
                score = 0
        if score:
            market_scores.append(float(score))
    avg_market = round(sum(market_scores) / len(market_scores), 1) if market_scores else 0

    high_risk = sum(
        1 for a in analyses
        if a.get("regulatory_complexity") == "high"
        or (a.get("raw_json", {}) or {}).get("risk_level") == "high"
    )

    # Domain distribution
    domain_dist: dict[str, int] = {}
    evidence_dist: dict[str, int] = {}
    for a in analyses:
        raw = a.get("raw_json") or {}
        domain = raw.get("domain", "unknown")
        domain_dist[domain] = domain_dist.get(domain, 0) + 1

        eq = raw.get("evidence_quality", {})
        if isinstance(eq, dict):
            level = eq.get("level", "unknown")
            evidence_dist[level] = evidence_dist.get(level, 0) + 1

    return {
        "total_papers": total,
        "analyzed_papers": len(analyses),
        "avg_trl_score": avg_trl,
        "avg_market_score": avg_market,
        "high_risk_count": high_risk,
        "domain_distribution": domain_dist,
        "evidence_distribution": evidence_dist,
    }
