"""
Entity extractor — lightweight LLM call to identify compounds, targets,
diseases and search terms from a paper's title + abstract.
These entities drive the external API enrichment pipeline.
"""
from __future__ import annotations
import json
import re
from app.config import settings
from app.services.llm_client import make_llm_client
from app.models.schemas import ExtractedEntities

# Provider-agnostic client (OpenRouter / Ollama / any OpenAI-compatible endpoint).
_client = make_llm_client(timeout=30.0)

_PROMPT = """Extract scientific entities from this paper's title and abstract.
Return ONLY a JSON object with these keys (empty list if not applicable):
{
  "compounds": ["drug/molecule/compound names — max 5"],
  "targets": ["gene/protein/receptor/pathway names — max 5"],
  "diseases": ["disease/condition/indication names — max 5"],
  "organisms": ["species names — max 3"],
  "mechanisms": ["biological mechanisms/processes — max 3"],
  "search_terms": ["3-5 specific search terms for ClinicalTrials.gov and PubMed — be specific, not generic"]
}
Rules:
- search_terms must be specific enough to find related work
  Good: "IL-6 inhibition rheumatoid arthritis"  Bad: "inflammation"
- Use standard scientific nomenclature
- NO markdown, NO explanation, ONLY the JSON object"""


def _parse_entities(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("`").strip()
    return json.loads(raw)


async def extract_entities(title: str, abstract: str) -> ExtractedEntities:
    text = f"TITLE: {title}\n\nABSTRACT: {abstract[:3000]}"

    for model in (settings.llm_model, settings.llm_model_fallback):
        try:
            resp = await _client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": _PROMPT},
                    {"role": "user", "content": text},
                ],
                temperature=0.0,
                max_tokens=350,
            )
            raw = resp.choices[0].message.content or "{}"
            data = _parse_entities(raw)
            return ExtractedEntities(**{k: v for k, v in data.items() if isinstance(v, list)})
        except Exception:
            continue

    # Non-fatal fallback — title as search term lets enrichers still run
    return ExtractedEntities(search_terms=[title[:120]])
