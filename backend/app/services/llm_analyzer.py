"""
LLLM analysis service — domain-aware paper analysis via OpenRouter.

Two-layer pipeline:
1. Domain detection — classifies paper into pharma_clinical, pharma_industrial,
   biotech, medical_device, chemicals, or academic_basic.
2. Domain-specific analysis — uses specialized system prompt with scoring
   criteria tailored to each domain (TRL, evidence quality, regulatory pathway, etc.)

Free models recommended:
  - meta-llama/llama-3.3-70b-instruct:free
  - google/gemini-2.0-flash-001 (very fast, cheap)
"""
from __future__ import annotations
import json
import re
from openai import AsyncOpenAI
from app.config import settings
from app.models.schemas import AnalysisResult

_client = AsyncOpenAI(
    api_key=settings.openrouter_api_key,
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "https://scilens.app",
        "X-Title": "SciLens",
    },
)

# ---------------------------------------------------------------------------
# Layer 1: Domain Detection
# ---------------------------------------------------------------------------

DOMAIN_DETECTION_PROMPT = """You are a scientific paper classifier. Classify the following paper into EXACTLY ONE of these domains:

- pharma_clinical: Drug development, clinical trials, pharmacology, therapeutics, FDA drug approval
- pharma_industrial: Pharmaceutical manufacturing, process chemistry, CMC, scale-up, GMP, formulation
- biotech: Biologics, cell therapy, gene therapy, synthetic biology, fermentation, bioprocessing
- medical_device: Diagnostic devices, implants, surgical tools, IVD, ISO 13485, 510(k)
- chemicals: Industrial chemistry, process safety, green chemistry, REACH, EPA, materials science
- agro_health: Crop science, pesticides, herbicides, biopesticides, fertilizers, food safety, EFSA, USDA, plant pathogens, GMO, phytosanitary, agronomy, livestock, aquaculture, bioestimulants
- academic_basic: Fundamental research, theoretical work, non-applied science, reviews

Return ONLY the domain name as a single word. No explanation."""


# ---------------------------------------------------------------------------
# Layer 2: Domain-Specific Analysis Prompts
# ---------------------------------------------------------------------------

DOMAIN_PROMPTS: dict[str, str] = {
    "pharma_clinical": """You are a pharmaceutical clinical intelligence analyst specializing in drug development and regulatory strategy.

Analyze the provided research paper and return ONLY a valid JSON object with this exact structure:

{
  "domain": "pharma_clinical",
  "trl_score": <integer 1-9>,
  "trl_confidence": <integer 0-100>,
  "trl_description": "<one sentence>",
  "tam_estimate": {
    "value": <float billions USD>,
    "currency": "USD",
    "breakdown": [
      {"segment": "<segment>", "value": <float billions>, "percentage": <integer>}
    ]
  },
  "risk_level": "<low|medium|high>",
  "risk_score": <integer 0-100>,
  "risk_factors": [
    {"category": "<technical|market|regulatory|competitive>", "description": "<specific risk>", "severity": "<low|medium|high>"}
  ],
  "key_findings": [
    {"title": "<title>", "description": "<one sentence>", "confidence": <integer 0-100>, "category": "<innovation|application|limitation|opportunity>"}
  ],
  "evidence_quality": {
    "level": "<meta_analysis|rct|cohort|case_control|in_vivo|in_vitro|in_silico|review|other>",
    "score": <integer 0-100>,
    "sample_size_adequacy": "<adequate|underpowered|unknown>",
    "statistical_rigor": "<high|medium|low>",
    "reproducibility_signals": "<strong|moderate|weak|none>"
  },
  "regulatory_pathway": "<e.g., IND → Phase I/II/III → NDA/BLA, or FDA De Novo, or EMA Centralized>",
  "regulatory_timeline": "<estimated timeline to approval, e.g., 5-7 years from current stage>",
  "methodology": "<experimental|observational|computational|theoretical|meta-analysis|review>",
  "methodology_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "novelty_score": <integer 0-100>,
  "tags": ["<tag1>", "<tag2>", "<tag3>", "<tag4>", "<tag5>"],
  "extracted_methods": ["<method1>", "<method2>", "<method3>"],
  "extracted_claims": ["<claim1>", "<claim2>", "<claim3>", "<claim4>"],
  "synthesis": "<2-3 sentence paragraph on commercial potential and strategic insight>"
}

TRIAL PHASE SIGNALS TO LOOK FOR:
- Preclinical: in vitro, animal models, toxicology → TRL 1-3
- Phase I: safety, PK/PD, healthy volunteers → TRL 4-5
- Phase II: efficacy, dose-ranging, patient population → TRL 5-6
- Phase III: large-scale, pivotal, comparator → TRL 7-8
- Post-marketing: real-world evidence → TRL 9

EVIDENCE QUALITY HIERARCHY (highest to lowest):
meta_analysis > rct > cohort > case_control > in_vivo > in_vitro > in_silico > review

REGULATORY CONSIDERATIONS:
- FDA pathway: IND → Phase I/II/III → NDA (small molecule) or BLA (biologic)
- EMA pathway: Scientific advice → MAA → Centralized procedure
- Look for: orphan drug designation, breakthrough therapy, fast track, accelerated approval
- Check for: ClinicalTrials.gov registration number, IRB approval, informed consent

Return ONLY the JSON object. No explanations, no markdown, no code blocks.""",

    "pharma_industrial": """You are a pharmaceutical manufacturing and industrial intelligence analyst specializing in process chemistry, CMC, and scale-up.

Analyze the provided research paper and return ONLY a valid JSON object with this exact structure:

{
  "domain": "pharma_industrial",
  "trl_score": <integer 1-9>,
  "trl_confidence": <integer 0-100>,
  "trl_description": "<one sentence>",
  "tam_estimate": {
    "value": <float billions USD>,
    "currency": "USD",
    "breakdown": [
      {"segment": "<segment>", "value": <float billions>, "percentage": <integer>}
    ]
  },
  "risk_level": "<low|medium|high>",
  "risk_score": <integer 0-100>,
  "risk_factors": [
    {"category": "<technical|market|regulatory|competitive>", "description": "<specific risk>", "severity": "<low|medium|high>"}
  ],
  "key_findings": [
    {"title": "<title>", "description": "<one sentence>", "confidence": <integer 0-100>, "category": "<innovation|application|limitation|opportunity>"}
  ],
  "evidence_quality": {
    "level": "<meta_analysis|rct|cohort|case_control|in_vivo|in_vitro|in_silico|review|other>",
    "score": <integer 0-100>,
    "sample_size_adequacy": "<adequate|underpowered|unknown>",
    "statistical_rigor": "<high|medium|low>",
    "reproducibility_signals": "<strong|moderate|weak|none>"
  },
  "regulatory_pathway": "<e.g., CMC section of NDA/BLA, GMP compliance, ICH Q8/Q9/Q10>",
  "regulatory_timeline": "<estimated timeline to commercial manufacturing readiness>",
  "methodology": "<experimental|observational|computational|theoretical|meta-analysis|review>",
  "methodology_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "novelty_score": <integer 0-100>,
  "tags": ["<tag1>", "<tag2>", "<tag3>", "<tag4>", "<tag5>"],
  "extracted_methods": ["<method1>", "<method2>", "<method3>"],
  "extracted_claims": ["<claim1>", "<claim2>", "<claim3>", "<claim4>"],
  "synthesis": "<2-3 sentence paragraph on industrial applicability and strategic insight>"
}

INDUSTRIAL SIGNALS TO LOOK FOR:
- GMP/GLP compliance mentions → higher TRL
- Scale-up from lab to pilot to commercial → TRL progression
- Yield percentages, cost of goods (COGS), process efficiency
- ICH guidelines: Q8 (Pharmaceutical Development), Q9 (Quality Risk), Q10 (Pharmaceutical Quality System)
- Stability studies (ICH Q1A), impurity profiling (ICH Q3)
- Technology transfer, validation, qualification

EVIDENCE QUALITY for industrial papers:
- Commercial-scale demonstration → score 80-100
- Pilot-scale with validation data → score 60-80
- Lab-scale with theoretical scale-up → score 30-60
- Purely theoretical/conceptual → score 0-30

Return ONLY the JSON object. No explanations, no markdown, no code blocks.""",

    "biotech": """You are a biotechnology intelligence analyst specializing in biologics, cell/gene therapy, and bioprocessing.

Analyze the provided research paper and return ONLY a valid JSON object with this exact structure:

{
  "domain": "biotech",
  "trl_score": <integer 1-9>,
  "trl_confidence": <integer 0-100>,
  "trl_description": "<one sentence>",
  "tam_estimate": {
    "value": <float billions USD>,
    "currency": "USD",
    "breakdown": [
      {"segment": "<segment>", "value": <float billions>, "percentage": <integer>}
    ]
  },
  "risk_level": "<low|medium|high>",
  "risk_score": <integer 0-100>,
  "risk_factors": [
    {"category": "<technical|market|regulatory|competitive>", "description": "<specific risk>", "severity": "<low|medium|high>"}
  ],
  "key_findings": [
    {"title": "<title>", "description": "<one sentence>", "confidence": <integer 0-100>, "category": "<innovation|application|limitation|opportunity>"}
  ],
  "evidence_quality": {
    "level": "<meta_analysis|rct|cohort|case_control|in_vivo|in_vitro|in_silico|review|other>",
    "score": <integer 0-100>,
    "sample_size_adequacy": "<adequate|underpowered|unknown>",
    "statistical_rigor": "<high|medium|low>",
    "reproducibility_signals": "<strong|moderate|weak|none>"
  },
  "regulatory_pathway": "<e.g., FDA CBER (cell/gene therapy), EMA CAT (advanced therapy), BLA>",
  "regulatory_timeline": "<estimated timeline to clinical/commercial readiness>",
  "methodology": "<experimental|observational|computational|theoretical|meta-analysis|review>",
  "methodology_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "novelty_score": <integer 0-100>,
  "tags": ["<tag1>", "<tag2>", "<tag3>", "<tag4>", "<tag5>"],
  "extracted_methods": ["<method1>", "<method2>", "<method3>"],
  "extracted_claims": ["<claim1>", "<claim2>", "<claim3>", "<claim4>"],
  "synthesis": "<2-3 sentence paragraph on commercial potential and strategic insight>"
}

BIOTECH SIGNALS TO LOOK FOR:
- Cell line development, upstream/downstream processing
- Bioreactor scale-up, titer, productivity metrics
- FDA CBER oversight for cell/gene therapies
- EMA CAT (Committee for Advanced Therapies) for ATMPs
- Viral vector production, purification, characterization
- Biosimilarity, comparability studies

EVIDENCE QUALITY for biotech:
- Clinical data (Phase I+) → score 70-100
- In vivo efficacy + safety → score 50-70
- In vitro proof of concept → score 30-50
- Computational design only → score 0-30

Return ONLY the JSON object. No explanations, no markdown, no code blocks.""",

    "medical_device": """You are a medical device regulatory and commercial intelligence analyst.

Analyze the provided research paper and return ONLY a valid JSON object with this exact structure:

{
  "domain": "medical_device",
  "trl_score": <integer 1-9>,
  "trl_confidence": <integer 0-100>,
  "trl_description": "<one sentence>",
  "tam_estimate": {
    "value": <float billions USD>,
    "currency": "USD",
    "breakdown": [
      {"segment": "<segment>", "value": <float billions>, "percentage": <integer>}
    ]
  },
  "risk_level": "<low|medium|high>",
  "risk_score": <integer 0-100>,
  "risk_factors": [
    {"category": "<technical|market|regulatory|competitive>", "description": "<specific risk>", "severity": "<low|medium|high>"}
  ],
  "key_findings": [
    {"title": "<title>", "description": "<one sentence>", "confidence": <integer 0-100>, "category": "<innovation|application|limitation|opportunity>"}
  ],
  "evidence_quality": {
    "level": "<meta_analysis|rct|cohort|case_control|in_vivo|in_vitro|in_silico|review|other>",
    "score": <integer 0-100>,
    "sample_size_adequacy": "<adequate|underpowered|unknown>",
    "statistical_rigor": "<high|medium|low>",
    "reproducibility_signals": "<strong|moderate|weak|none>"
  },
  "regulatory_pathway": "<e.g., FDA 510(k), De Novo, PMA; CE Mark (MDR); ISO 13485>",
  "regulatory_timeline": "<estimated timeline to market clearance>",
  "methodology": "<experimental|observational|computational|theoretical|meta-analysis|review>",
  "methodology_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "novelty_score": <integer 0-100>,
  "tags": ["<tag1>", "<tag2>", "<tag3>", "<tag4>", "<tag5>"],
  "extracted_methods": ["<method1>", "<method2>", "<method3>"],
  "extracted_claims": ["<claim1>", "<claim2>", "<claim3>", "<claim4>"],
  "synthesis": "<2-3 sentence paragraph on commercial potential and strategic insight>"
}

DEVICE REGULATORY SIGNALS:
- FDA 510(k): predicate device, substantial equivalence → 6-18 months
- FDA De Novo: novel device, low-moderate risk → 12-24 months
- FDA PMA: Class III, high risk → 18-36 months
- CE Mark under MDR: clinical evaluation report, notified body
- ISO 13485: quality management system
- IEC 60601: electrical safety, IEC 62304: software

EVIDENCE QUALITY for devices:
- Clinical study with patient outcomes → score 70-100
- Bench testing + biocompatibility → score 40-70
- Computational/simulation only → score 0-40

Return ONLY the JSON object. No explanations, no markdown, no code blocks.""",

    "chemicals": """You are a chemical industry intelligence analyst specializing in process chemistry, industrial applications, and regulatory compliance.

Analyze the provided research paper and return ONLY a valid JSON object with this exact structure:

{
  "domain": "chemicals",
  "trl_score": <integer 1-9>,
  "trl_confidence": <integer 0-100>,
  "trl_description": "<one sentence>",
  "tam_estimate": {
    "value": <float billions USD>,
    "currency": "USD",
    "breakdown": [
      {"segment": "<segment>", "value": <float billions>, "percentage": <integer>}
    ]
  },
  "risk_level": "<low|medium|high>",
  "risk_score": <integer 0-100>,
  "risk_factors": [
    {"category": "<technical|market|regulatory|competitive>", "description": "<specific risk>", "severity": "<low|medium|high>"}
  ],
  "key_findings": [
    {"title": "<title>", "description": "<one sentence>", "confidence": <integer 0-100>, "category": "<innovation|application|limitation|opportunity>"}
  ],
  "evidence_quality": {
    "level": "<meta_analysis|rct|cohort|case_control|in_vivo|in_vitro|in_silico|review|other>",
    "score": <integer 0-100>,
    "sample_size_adequacy": "<adequate|underpowered|unknown>",
    "statistical_rigor": "<high|medium|low>",
    "reproducibility_signals": "<strong|moderate|weak|none>"
  },
  "regulatory_pathway": "<e.g., REACH registration, EPA TSCA, GHS classification>",
  "regulatory_timeline": "<estimated timeline to commercial/regulatory readiness>",
  "methodology": "<experimental|observational|computational|theoretical|meta-analysis|review>",
  "methodology_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "novelty_score": <integer 0-100>,
  "tags": ["<tag1>", "<tag2>", "<tag3>", "<tag4>", "<tag5>"],
  "extracted_methods": ["<method1>", "<method2>", "<method3>"],
  "extracted_claims": ["<claim1>", "<claim2>", "<claim3>", "<claim4>"],
  "synthesis": "<2-3 sentence paragraph on industrial applicability and strategic insight>"
}

CHEMICAL INDUSTRY SIGNALS:
- REACH (EU): registration, evaluation, authorization of chemicals
- EPA TSCA (US): Toxic Substances Control Act
- GHS: Globally Harmonized System of classification
- Process safety: HAZOP, LOPA, inherently safer design
- Green chemistry: atom economy, E-factor, solvent selection
- Scale-up: batch to continuous, flow chemistry, catalysis

EVIDENCE QUALITY for chemicals:
- Pilot/commercial demonstration → score 70-100
- Lab-scale with reproducibility data → score 40-70
- Computational/screening only → score 0-40

Return ONLY the JSON object. No explanations, no markdown, no code blocks.""",

    "academic_basic": """You are a scientific intelligence analyst evaluating fundamental research for potential commercial and industrial applications.

Analyze the provided research paper and return ONLY a valid JSON object with this exact structure:

{
  "domain": "academic_basic",
  "trl_score": <integer 1-9>,
  "trl_confidence": <integer 0-100>,
  "trl_description": "<one sentence>",
  "tam_estimate": {
    "value": <float billions USD>,
    "currency": "USD",
    "breakdown": [
      {"segment": "<segment>", "value": <float billions>, "percentage": <integer>}
    ]
  },
  "risk_level": "<low|medium|high>",
  "risk_score": <integer 0-100>,
  "risk_factors": [
    {"category": "<technical|market|regulatory|competitive>", "description": "<specific risk>", "severity": "<low|medium|high>"}
  ],
  "key_findings": [
    {"title": "<title>", "description": "<one sentence>", "confidence": <integer 0-100>, "category": "<innovation|application|limitation|opportunity>"}
  ],
  "evidence_quality": {
    "level": "<meta_analysis|rct|cohort|case_control|in_vivo|in_vitro|in_silico|review|other>",
    "score": <integer 0-100>,
    "sample_size_adequacy": "<adequate|underpowered|unknown>",
    "statistical_rigor": "<high|medium|low>",
    "reproducibility_signals": "<strong|moderate|weak|none>"
  },
  "regulatory_pathway": "<not applicable or identify potential future pathway>",
  "regulatory_timeline": "<early stage — estimate if path to application exists>",
  "methodology": "<experimental|observational|computational|theoretical|meta-analysis|review>",
  "methodology_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "novelty_score": <integer 0-100>,
  "tags": ["<tag1>", "<tag2>", "<tag3>", "<tag4>", "<tag5>"],
  "extracted_methods": ["<method1>", "<method2>", "<method3>"],
  "extracted_claims": ["<claim1>", "<claim2>", "<claim3>", "<claim4>"],
  "synthesis": "<2-3 sentence paragraph on potential applications and strategic insight>"
}

ACADEMIC RESEARCH ASSESSMENT:
- Focus on novelty, scientific rigor, and potential downstream applications
- TRL typically 1-3 for basic research
- Identify any translational potential or industry relevance
- Note limitations for commercial applicability

EVIDENCE QUALITY:
- Systematic review/meta-analysis → score 70-100
- Well-designed experimental study → score 50-70
- Observational/correlational → score 30-50
- Theoretical/hypothesis only → score 0-30

Return ONLY the JSON object. No explanations, no markdown, no code blocks.""",

    "agro_health": """You are an agricultural and food science intelligence analyst specializing in crop protection, biopesticides, agronomy, and food safety.

Analyze the provided research paper and return ONLY a valid JSON object with this exact structure:

{
  "domain": "agro_health",
  "trl_score": <integer 1-9>,
  "trl_confidence": <integer 0-100>,
  "trl_description": "<one sentence>",
  "tam_estimate": {
    "value": <float billions USD>,
    "currency": "USD",
    "breakdown": [
      {"segment": "<segment>", "value": <float billions>, "percentage": <integer>}
    ]
  },
  "risk_level": "<low|medium|high>",
  "risk_score": <integer 0-100>,
  "risk_factors": [
    {"category": "<technical|market|regulatory|competitive>", "description": "<specific risk>", "severity": "<low|medium|high>"}
  ],
  "key_findings": [
    {"title": "<title>", "description": "<one sentence>", "confidence": <integer 0-100>, "category": "<innovation|application|limitation|opportunity>"}
  ],
  "evidence_quality": {
    "level": "<meta_analysis|rct|cohort|case_control|in_vivo|in_vitro|in_silico|review|other>",
    "score": <integer 0-100>,
    "sample_size_adequacy": "<adequate|underpowered|unknown>",
    "statistical_rigor": "<high|medium|low>",
    "reproducibility_signals": "<strong|moderate|weak|none>"
  },
  "regulatory_pathway": "<e.g., EFSA plant protection authorization, USDA APHIS biotech, EPA biopesticide registration, ISO 11063>",
  "regulatory_timeline": "<estimated timeline to market authorization>",
  "methodology": "<experimental|observational|computational|theoretical|meta-analysis|review>",
  "methodology_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "novelty_score": <integer 0-100>,
  "tags": ["<tag1>", "<tag2>", "<tag3>", "<tag4>", "<tag5>"],
  "extracted_methods": ["<method1>", "<method2>", "<method3>"],
  "extracted_claims": ["<claim1>", "<claim2>", "<claim3>", "<claim4>"],
  "synthesis": "<2-3 sentence paragraph on agronomic/commercial potential and regulatory strategy>"
}

TRL IN AGRO-HEALTH CONTEXT:
1-3 = Lab or greenhouse proof-of-concept (bioassay, in vitro efficacy)
4-5 = Controlled field trial, single location, limited crop/pest scope
6-7 = Multi-location field trial, dose-response, efficacy under realistic conditions
8-9 = Registered product, commercial-scale validation, market authorization obtained

EVIDENCE QUALITY HIERARCHY for agro:
multi-location field trial > single-location field trial > greenhouse trial > in vivo bioassay > in vitro bioassay > computational/in silico model

REGULATORY SIGNALS TO LOOK FOR:
- EFSA: European Food Safety Authority authorization (plant protection products, novel foods)
- USDA APHIS: Biotech/GMO crop regulation
- EPA Biopesticide registration (US) — FIFRA
- ISO 11063: Soil quality for pesticide degradation
- Phytosanitary certifications, MRL (Maximum Residue Limits)
- Good Agricultural Practice (GAP) mentions
- Codex Alimentarius standards

RISK FACTORS SPECIFIC TO AGRO:
- Pest resistance development (technical)
- Country-by-country phytosanitary approval (regulatory)
- GM crop social acceptance, label requirements (market)
- Climate window dependency, crop cycle constraints (technical)
- Patent landscape for trait/formulation (competitive)

TAM SEGMENTS TO CONSIDER:
- Crop protection market (herbicides, fungicides, insecticides, biopesticides)
- Biostimulants and soil health
- Treated seeds / seed coating
- Precision agronomy / digital agri tools
- Food safety testing and mycotoxin management
- Aquaculture health management

Return ONLY the JSON object. No explanations, no markdown, no code blocks.""",
}

# Generic fallback prompt (same structure as academic_basic but domain-agnostic)
GENERIC_PROMPT = DOMAIN_PROMPTS["academic_basic"]


def _extract_json(text: str) -> dict:
    """Extract JSON from LLM output, tolerating markdown or extra text."""
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No valid JSON found in LLM output: {text[:200]}")


async def detect_domain(abstract: str, sections_text: str) -> str:
    """Layer 1: Detect the paper's domain using a lightweight prompt."""
    context = f"TITLE + ABSTRACT:\n{abstract}\n\nKEY SECTIONS:\n{sections_text[:5000]}"

    for attempt in range(2):
        try:
            response = await _client.chat.completions.create(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": DOMAIN_DETECTION_PROMPT},
                    {"role": "user", "content": context},
                ],
                temperature=0.0,
                max_tokens=20,
            )
            raw = (response.choices[0].message.content or "academic_basic").strip().lower()
            # Normalize
            for domain in DOMAIN_PROMPTS:
                if domain in raw:
                    return domain
            return "academic_basic"
        except Exception:
            if attempt == 0:
                continue
            return "academic_basic"


async def analyze_paper(title: str, abstract: str, sections_text: str, domain: str | None = None) -> AnalysisResult:
    """
    Layer 2: Analyze paper with domain-specific prompt.
    sections_text should be built by pdf_parser.build_priority_context().
    """
    if domain is None:
        domain = await detect_domain(abstract, sections_text)

    system_prompt = DOMAIN_PROMPTS.get(domain, GENERIC_PROMPT)

    user_message = f"""PAPER TITLE: {title}

ABSTRACT:
{abstract}

PAPER CONTENT (structured sections):
{sections_text}

Analyze this paper and return the JSON assessment."""

    import asyncio as _asyncio

    last_error: Exception = RuntimeError("No attempts made")

    for attempt in range(3):
        for use_json_mode in (True, False):
            try:
                kwargs: dict = dict(
                    model=settings.llm_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    temperature=0.1,
                    max_tokens=3000,
                )
                if use_json_mode:
                    kwargs["response_format"] = {"type": "json_object"}

                response = await _client.chat.completions.create(**kwargs)
                raw = response.choices[0].message.content or "{}"
                data = _extract_json(raw)
                return AnalysisResult(**data)

            except Exception as e:
                last_error = e
                err_str = str(e)
                if not use_json_mode:
                    if "429" in err_str or "rate" in err_str.lower():
                        break
                    raise
                continue

        if "429" in str(last_error) or "rate" in str(last_error).lower():
            wait = 35 * (attempt + 1)
            await _asyncio.sleep(wait)
        else:
            raise last_error

    raise last_error
