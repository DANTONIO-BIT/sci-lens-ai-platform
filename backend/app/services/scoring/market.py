"""
Market evidence calculator — computes a calibrated market validation score
from real clinical trial and FDA approval data.
No AI estimates — only verifiable external data.
"""
from __future__ import annotations
from typing import Literal
from app.models.schemas import EnrichmentResult, MarketEvidence

_DOMAIN_WEIGHTS: dict[str, dict] = {
    "pharma_clinical":   {"approvals": 0.45, "trials": 0.40, "citations": 0.15, "apm": 25},
    "biotech":           {"approvals": 0.35, "trials": 0.45, "citations": 0.20, "apm": 20},
    "medical_device":    {"approvals": 0.50, "trials": 0.30, "citations": 0.20, "apm": 30},
    "agro_health":       {"approvals": 0.30, "trials": 0.30, "citations": 0.40, "apm": 20},
    "academic_basic":    {"approvals": 0.20, "trials": 0.25, "citations": 0.55, "apm": 15},
    "chemicals":         {"approvals": 0.25, "trials": 0.25, "citations": 0.50, "apm": 15},
    "pharma_industrial": {"approvals": 0.35, "trials": 0.35, "citations": 0.30, "apm": 20},
}
_DEFAULT_WEIGHTS = {"approvals": 0.35, "trials": 0.35, "citations": 0.30, "apm": 20}


def _maturity(
    approvals: int, trials: int, citations: int
) -> Literal["nascent", "emerging", "growing", "established", "mature"]:
    if approvals >= 5 or (approvals >= 2 and trials >= 20):
        return "mature"
    if approvals >= 2 or (approvals >= 1 and trials >= 10):
        return "established"
    if trials >= 10 or (approvals >= 1 and trials >= 3):
        return "growing"
    if trials >= 3 or citations >= 50:
        return "emerging"
    return "nascent"


def _citation_signal(citations: int, influential: int) -> str:
    if not citations:
        return "no citation data available"
    label = (
        "very high" if citations >= 200 else
        "high" if citations >= 50 else
        "moderate" if citations >= 10 else
        "early-stage"
    )
    s = f"{citations} citations ({label} activity)"
    if influential:
        s += f" — {influential} highly influential"
    return s


def calculate_market_evidence(enrichment: EnrichmentResult, domain: str) -> MarketEvidence:
    w = _DOMAIN_WEIGHTS.get(domain, _DEFAULT_WEIGHTS)
    pc = enrichment.trial_count_by_phase
    approvals = enrichment.total_approvals_in_space
    citations = enrichment.semantic_scholar_citations
    influential = enrichment.semantic_scholar_influential_citations

    approval_score = min(100, approvals * w["apm"])
    trial_score = min(100,
        pc.get("phase3", 0) * 20 +
        pc.get("phase2", 0) * 12 +
        pc.get("phase1", 0) * 6
    )
    citation_score = min(100, (citations / 5) + (influential * 3))

    score = int(
        approval_score * w["approvals"] +
        trial_score * w["trials"] +
        citation_score * w["citations"]
    )

    _active_statuses = {"recruiting", "active, not recruiting", "enrolling by invitation"}
    active = sum(1 for t in enrichment.trials if t.status.lower() in _active_statuses)
    completed = sum(1 for t in enrichment.trials if "completed" in t.status.lower())

    parts: list[str] = []
    if approvals:
        parts.append(f"{approvals} FDA-approved drug(s) in class")
    if active:
        parts.append(f"{active} active trial(s)")
    if completed:
        parts.append(f"{completed} completed trial(s)")
    if not parts:
        parts.append("No approvals or trials found — pre-clinical/emerging space")

    return MarketEvidence(
        field_maturity=_maturity(approvals, enrichment.total_trials_in_space, citations),
        market_validation_score=min(100, score),
        active_trials_in_space=active,
        completed_trials_in_space=completed,
        approved_drugs_in_class=approvals,
        evidence_basis="; ".join(parts),
        citation_signal=_citation_signal(citations, influential),
    )
