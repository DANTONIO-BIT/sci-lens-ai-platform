"""
ClinicalTrials.gov API v2 — real trial data for TRL and market scoring.
Free, no authentication required.
Docs: https://clinicaltrials.gov/data-api/api
"""
from __future__ import annotations
import httpx
from app.models.schemas import TrialInfo

_BASE = "https://clinicaltrials.gov/api/v2"
_TIMEOUT = 20.0
_FIELDS = "NCTId,BriefTitle,OverallStatus,Phase,Condition,InterventionName"


async def search_trials(search_terms: list[str], max_per_term: int = 15) -> list[TrialInfo]:
    """
    Query ClinicalTrials.gov for trials related to extracted entities.
    Uses up to 3 search terms to avoid hammering the API.
    """
    if not search_terms:
        return []

    seen: set[str] = set()
    trials: list[TrialInfo] = []

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for term in search_terms[:3]:
            try:
                r = await client.get(
                    f"{_BASE}/studies",
                    params={
                        "query.term": term,
                        "pageSize": max_per_term,
                        "fields": _FIELDS,
                        "format": "json",
                    },
                )
                if r.status_code != 200:
                    continue

                for study in r.json().get("studies", []):
                    proto = study.get("protocolSection", {})
                    id_mod = proto.get("identificationModule", {})
                    nct_id = id_mod.get("nctId", "")
                    if not nct_id or nct_id in seen:
                        continue
                    seen.add(nct_id)

                    status_mod = proto.get("statusModule", {})
                    design_mod = proto.get("designModule", {})
                    cond_mod = proto.get("conditionsModule", {})
                    arms_mod = proto.get("armsInterventionsModule", {})

                    phases = design_mod.get("phases", [])
                    interventions = [
                        i.get("name", "")
                        for i in arms_mod.get("interventions", [])
                        if i.get("name")
                    ]

                    trials.append(TrialInfo(
                        nct_id=nct_id,
                        title=id_mod.get("briefTitle", ""),
                        status=status_mod.get("overallStatus", ""),
                        phase=", ".join(phases) if phases else "N/A",
                        conditions=cond_mod.get("conditions", [])[:3],
                        interventions=interventions[:3],
                    ))

            except Exception:
                continue

    return trials


def summarize_by_phase(trials: list[TrialInfo]) -> dict[str, int]:
    counts = {"phase1": 0, "phase2": 0, "phase3": 0, "phase4": 0, "active": 0, "completed": 0}

    active_statuses = {"recruiting", "active, not recruiting", "enrolling by invitation"}

    for t in trials:
        p = t.phase.lower()
        if "phase 1" in p or "phase i" in p:
            counts["phase1"] += 1
        if "phase 2" in p or "phase ii" in p:
            counts["phase2"] += 1
        if "phase 3" in p or "phase iii" in p:
            counts["phase3"] += 1
        if "phase 4" in p or "phase iv" in p:
            counts["phase4"] += 1

        s = t.status.lower()
        if s in active_statuses:
            counts["active"] += 1
        if "completed" in s:
            counts["completed"] += 1

    return counts
