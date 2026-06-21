"""
TRL context calculator — derives field TRL floor from real clinical/approval data.
This provides the LLM with an externally-validated anchor for its TRL assessment.
"""
from __future__ import annotations
from app.models.schemas import EnrichmentResult


def calculate_trl_context(enrichment: EnrichmentResult) -> dict:
    """
    Returns context dict injected into the LLM prompt:
      field_trl      — TRL of the broader therapeutic/technology space
      trl_evidence   — human-readable basis for field_trl
      approvals      — count of FDA approvals in class
      total_trials   — count of trials found in space
    """
    pc = enrichment.trial_count_by_phase
    approvals = enrichment.total_approvals_in_space
    total = enrichment.total_trials_in_space

    if approvals >= 3:
        field_trl = 9
    elif approvals >= 1:
        field_trl = 8
    elif pc.get("phase3", 0) > 0:
        field_trl = 7
    elif pc.get("phase2", 0) > 0:
        field_trl = 6
    elif pc.get("phase1", 0) > 0:
        field_trl = 4
    elif total > 0:
        field_trl = 3
    else:
        field_trl = 2

    parts: list[str] = []
    if approvals:
        parts.append(f"{approvals} FDA-approved drug(s) in this class")
    if pc.get("phase3", 0):
        parts.append(f"{pc['phase3']} Phase III trial(s)")
    if pc.get("phase2", 0):
        parts.append(f"{pc['phase2']} Phase II trial(s)")
    if pc.get("phase1", 0):
        parts.append(f"{pc['phase1']} Phase I trial(s)")
    if not parts:
        parts.append("No trials or approvals found — pre-clinical space")

    return {
        "field_trl": field_trl,
        "trl_evidence": "; ".join(parts),
        "approvals": approvals,
        "total_trials": total,
    }
