"""
LLM Synthesis Service — the model INTERPRETS, it does not estimate.

Pipeline:
1. Domain detection (lightweight call)
2. Full synthesis — paper text + real enrichment data → structured analysis

Market scores and TRL field context come from the scoring engine (real data).
The LLM's job is to read the paper and assess methodology, evidence quality,
regulatory pathway, and strategic implications.
"""
from __future__ import annotations
import json
import re
import asyncio
from pathlib import Path
from openai import AsyncOpenAI
from app.config import settings
from app.models.schemas import AnalysisResult, EvidenceQuality, MarketEvidence, EnrichmentResult

_PROMPTS_DIR = Path(__file__).parent.parent.parent / "prompts"

_client = AsyncOpenAI(
    api_key=settings.openrouter_api_key,
    base_url="https://openrouter.ai/api/v1",
    timeout=90.0,
    default_headers={"HTTP-Referer": "https://scilens.app", "X-Title": "SciLens"},
)

# ---------------------------------------------------------------------------
# Domain detection
# ---------------------------------------------------------------------------

_DOMAIN_SYSTEM = """Classify the paper into EXACTLY ONE domain. Return only the domain name — no explanation.

Domains:
- pharma_clinical: drug development, clinical trials, therapeutics, FDA drug approval
- pharma_industrial: pharmaceutical manufacturing, process chemistry, CMC, GMP, formulation
- biotech: biologics, cell/gene therapy, synthetic biology, fermentation, bioprocessing
- medical_device: diagnostic devices, implants, surgical tools, IVD, ISO 13485
- chemicals: industrial chemistry, process safety, green chemistry, REACH, materials
- agro_health: crop science, pesticides, biopesticides, food safety, EFSA, plant pathogens, livestock
- academic_basic: fundamental research, theoretical, non-applied, reviews"""


async def detect_domain(abstract: str, sections_text: str) -> str:
    context = f"ABSTRACT:\n{abstract}\n\nKEY SECTIONS:\n{sections_text[:4000]}"

    for model in (settings.llm_model, settings.llm_model_fallback):
        try:
            r = await _client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": _DOMAIN_SYSTEM},
                    {"role": "user", "content": context},
                ],
                temperature=0.0,
                max_tokens=20,
            )
            raw = (r.choices[0].message.content or "academic_basic").strip().lower()
            domains = [
                "pharma_clinical", "pharma_industrial", "biotech",
                "medical_device", "chemicals", "agro_health", "academic_basic",
            ]
            for d in domains:
                if d in raw:
                    return d
            return "academic_basic"
        except Exception:
            continue

    return "academic_basic"


# ---------------------------------------------------------------------------
# Prompt loading
# ---------------------------------------------------------------------------

def _load_domain_guide(domain: str) -> str:
    path = _PROMPTS_DIR / f"{domain}.md"
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        fallback = _PROMPTS_DIR / "academic_basic.md"
        return fallback.read_text(encoding="utf-8") if fallback.exists() else ""


# ---------------------------------------------------------------------------
# JSON extraction
# ---------------------------------------------------------------------------

def _extract_json(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    raise ValueError(f"No valid JSON in LLM output: {text[:300]}")


# ---------------------------------------------------------------------------
# Synthesis prompt builder
# ---------------------------------------------------------------------------

_RESPONSE_SCHEMA = """{
  "domain": "<domain>",
  "trl_score": <1-9 — based on THIS paper's own experimental evidence>,
  "trl_confidence": <0-100>,
  "trl_description": "<one sentence citing the paper's specific evidence stage>",
  "risk_level": "<low|medium|high>",
  "risk_score": <0-100>,
  "risk_factors": [
    {"category": "<technical|market|regulatory|competitive>", "description": "<specific risk>", "severity": "<low|medium|high>"}
  ],
  "key_findings": [
    {"title": "<short title>", "description": "<one sentence>", "confidence": <0-100>, "category": "<innovation|application|limitation|opportunity>"}
  ],
  "evidence_quality": {
    "level": "<meta_analysis|rct|cohort|case_control|in_vivo|in_vitro|in_silico|review|other>",
    "score": <0-100>,
    "sample_size_adequacy": "<adequate|underpowered|unknown>",
    "statistical_rigor": "<high|medium|low>",
    "reproducibility_signals": "<strong|moderate|weak|none>"
  },
  "regulatory_pathway": "<realistic regulatory path based on paper stage>",
  "regulatory_timeline": "<realistic timeline estimate>",
  "methodology": "<experimental|observational|computational|theoretical|meta-analysis|review>",
  "methodology_score": <0-100>,
  "impact_score": <0-100>,
  "novelty_score": <0-100>,
  "tags": ["<5 specific scientific tags>"],
  "extracted_methods": ["<3-5 specific methods used in this paper>"],
  "extracted_claims": ["<3-5 key claims the authors make>"],
  "synthesis": "<3-4 sentences: what this paper contributes, its limitations, and strategic implications — reference the external data context provided>"
}"""


def _build_prompt(
    title: str,
    abstract: str,
    sections_text: str,
    domain: str,
    trl_context: dict,
    market_evidence: MarketEvidence,
    enrichment: EnrichmentResult,
) -> tuple[str, str]:
    domain_guide = _load_domain_guide(domain)

    sources_str = (
        ", ".join(enrichment.sources_used) if enrichment.sources_used
        else "none available"
    )

    system = f"""You are a scientific intelligence analyst for SciLens.
Your role is to SYNTHESIZE and INTERPRET the paper — real market and clinical data
has already been computed from external APIs and is provided below.

DOMAIN SCORING GUIDE:
{domain_guide}

CRITICAL RULES:
- TRL must reflect THIS paper's own experimental evidence stage, not the field
- Do NOT invent dollar values or market size estimates — reference provided data instead
- All Literal fields must use EXACTLY the allowed values (lowercase, underscores)
- Return ONLY valid JSON — no markdown, no explanation"""

    # Enrichment block
    trial_summary = []
    for t in enrichment.trials[:3]:
        trial_summary.append(f"  • {t.nct_id}: {t.title[:80]} [{t.phase} — {t.status}]")
    trials_str = "\n".join(trial_summary) if trial_summary else "  None found"

    approval_summary = []
    for a in enrichment.approvals[:3]:
        approval_summary.append(f"  • {a.brand_name} ({a.generic_name}) — {a.approval_date[:4] if a.approval_date else 'N/A'}")
    approvals_str = "\n".join(approval_summary) if approval_summary else "  None found"

    user = f"""PAPER TITLE: {title}

ABSTRACT:
{abstract}

KEY SECTIONS:
{sections_text}

════════════════════════════════════════════════════
EXTERNAL DATA (verified from: {sources_str})

Field TRL context: {trl_context['field_trl']} — {trl_context['trl_evidence']}
Market validation score: {market_evidence.market_validation_score}/100
Field maturity: {market_evidence.field_maturity}
Evidence basis: {market_evidence.evidence_basis}
Citation signal: {market_evidence.citation_signal}

Active trials (top 3):
{trials_str}

FDA-approved drugs in class (top 3):
{approvals_str}
════════════════════════════════════════════════════

Analyze this paper following the domain guide. Return JSON:
{_RESPONSE_SCHEMA}"""

    return system, user


# ---------------------------------------------------------------------------
# Main synthesis entry point
# ---------------------------------------------------------------------------

async def analyze_paper(
    title: str,
    abstract: str,
    sections_text: str,
    domain: str,
    enrichment: EnrichmentResult,
    trl_context: dict,
    market_evidence: MarketEvidence,
) -> AnalysisResult:
    system_prompt, user_message = _build_prompt(
        title, abstract, sections_text, domain,
        trl_context, market_evidence, enrichment,
    )

    last_error: Exception = RuntimeError("no attempts")

    for model in (settings.llm_model, settings.llm_model_fallback):
        for use_json_mode in (True, False):
            try:
                kwargs: dict = dict(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    temperature=0.1,
                    max_tokens=3500,
                )
                if use_json_mode:
                    kwargs["response_format"] = {"type": "json_object"}

                r = await _client.chat.completions.create(**kwargs)
                raw = r.choices[0].message.content or "{}"
                data = _extract_json(raw)

                # Inject real market data — override any LLM estimate
                data["market_evidence"] = market_evidence.model_dump()
                data["enrichment"] = enrichment.model_dump()

                return AnalysisResult(**data)

            except Exception as e:
                last_error = e
                err = str(e)
                # Rate limit — try other model
                if "429" in err or "rate" in err.lower():
                    await asyncio.sleep(10)
                    break
                # json_mode not supported — retry without
                if use_json_mode:
                    continue
                # Any other error on this model — try fallback
                break

    raise last_error
