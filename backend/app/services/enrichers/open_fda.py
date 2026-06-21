"""
OpenFDA API — FDA drug approval data for market validation.
Free: 40 req/min without key, 240 req/min with key.
Docs: https://open.fda.gov/apis/
"""
from __future__ import annotations
import httpx
from app.config import settings
from app.models.schemas import ApprovalInfo

_BASE = "https://api.fda.gov"
_TIMEOUT = 15.0


def _params(extra: dict) -> dict:
    p = {"limit": 10, **extra}
    if settings.openfda_api_key:
        p["api_key"] = settings.openfda_api_key
    return p


async def search_approvals(terms: list[str]) -> list[ApprovalInfo]:
    """
    Search FDA drug applications by disease/compound terms.
    Returns approved drugs in the therapeutic class as market anchors.
    """
    if not terms:
        return []

    approvals: list[ApprovalInfo] = []
    seen: set[str] = set()

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for term in terms[:2]:
            try:
                # Search by brand name or active ingredient
                query = (
                    f'products.brand_name:"{term}" OR '
                    f'products.active_ingredients.name:"{term}"'
                )
                r = await client.get(
                    f"{_BASE}/drug/drugsfda.json",
                    params=_params({"search": query}),
                )
                if r.status_code != 200:
                    continue

                for hit in r.json().get("results", []):
                    app_num = hit.get("application_number", "")
                    if not app_num or app_num in seen:
                        continue
                    seen.add(app_num)

                    products = hit.get("products", [])
                    brand = products[0].get("brand_name", "") if products else ""
                    active_ingredients = []
                    for p in products:
                        for ai in p.get("active_ingredients", []):
                            name = ai.get("name", "")
                            if name and name not in active_ingredients:
                                active_ingredients.append(name)

                    approval_date = ""
                    for sub in hit.get("submissions", []):
                        if sub.get("submission_status") == "AP":
                            approval_date = sub.get("submission_status_date", "")
                            break

                    approvals.append(ApprovalInfo(
                        brand_name=brand,
                        generic_name=", ".join(active_ingredients[:2]),
                        application_number=app_num,
                        approval_date=approval_date,
                    ))

            except Exception:
                continue

    return approvals
