"""
Semantic Scholar API — citation metrics and paper influence.
Free: 1 req/sec without key, 10 req/sec with API key.
Docs: https://api.semanticscholar.org/graph/v1
"""
from __future__ import annotations
import httpx

_BASE = "https://api.semanticscholar.org/graph/v1"
_FIELDS = "citationCount,influentialCitationCount,year,venue"
_TIMEOUT = 15.0


async def get_paper_metrics(title: str, doi: str | None = None) -> dict:
    """
    Fetch citation count and influence metrics for a paper.
    Tries DOI first (precise), falls back to title search.
    """
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if doi:
            try:
                r = await client.get(
                    f"{_BASE}/paper/DOI:{doi}",
                    params={"fields": _FIELDS},
                )
                if r.status_code == 200:
                    d = r.json()
                    return {
                        "citation_count": d.get("citationCount", 0),
                        "influential_citations": d.get("influentialCitationCount", 0),
                        "found": True,
                    }
            except Exception:
                pass

        try:
            r = await client.get(
                f"{_BASE}/paper/search",
                params={"query": title[:200], "fields": _FIELDS, "limit": 1},
            )
            if r.status_code == 200:
                results = r.json().get("data", [])
                if results:
                    return {
                        "citation_count": results[0].get("citationCount", 0),
                        "influential_citations": results[0].get("influentialCitationCount", 0),
                        "found": True,
                    }
        except Exception:
            pass

    return {"citation_count": 0, "influential_citations": 0, "found": False}
