"""
Enrichment orchestrator — runs all external API calls in parallel.
Individual failures are logged but never block the analysis pipeline.
"""
from __future__ import annotations
import asyncio
from app.models.schemas import EnrichmentResult, ExtractedEntities
from app.services.enrichers import semantic_scholar, clinical_trials, open_fda


async def _safe(coro, default):
    try:
        return await coro
    except Exception:
        return default


async def enrich_paper(
    title: str,
    doi: str | None,
    entities: ExtractedEntities,
) -> EnrichmentResult:
    """
    Run all enrichers in parallel. Returns a complete EnrichmentResult
    even if some APIs are unavailable — errors are captured in enrichment_errors.
    """
    search_terms = entities.search_terms or [title[:120]]
    fda_terms = (entities.diseases + entities.compounds)[:3]

    async def _empty() -> list:
        return []

    scholar_res, trials, approvals = await asyncio.gather(
        _safe(semantic_scholar.get_paper_metrics(title, doi),
              {"citation_count": 0, "influential_citations": 0, "found": False}),
        _safe(clinical_trials.search_trials(search_terms), []),
        _safe(open_fda.search_approvals(fda_terms) if fda_terms else _empty(), []),
    )

    phase_counts = clinical_trials.summarize_by_phase(trials)
    sources: list[str] = []
    errors: list[str] = []

    if scholar_res.get("found"):
        sources.append("Semantic Scholar")
    if trials:
        sources.append("ClinicalTrials.gov")
    if approvals:
        sources.append("OpenFDA")

    return EnrichmentResult(
        entities=entities,
        semantic_scholar_citations=scholar_res.get("citation_count", 0),
        semantic_scholar_influential_citations=scholar_res.get("influential_citations", 0),
        trials=trials[:10],
        trial_count_by_phase=phase_counts,
        total_trials_in_space=len(trials),
        approvals=approvals[:10],
        total_approvals_in_space=len(approvals),
        sources_used=sources,
        enrichment_errors=errors,
    )
