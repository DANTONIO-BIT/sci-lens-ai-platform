"""
Tests for llm_analyzer service (data-driven architecture).
- JSON extraction helper
- Domain detection logic (mocked LLM calls)
- Per-domain scoring guides loaded from prompts/
- AnalysisResult schema validation
- analyze_paper smoke test (mocked LLM, real enrichment/market context)
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.llm_analyzer import (
    _extract_json,
    _DOMAIN_SYSTEM,
    _load_domain_guide,
    detect_domain,
    analyze_paper,
)
from app.models.schemas import (
    AnalysisResult,
    MarketEvidence,
    EnrichmentResult,
)

ALL_DOMAINS = [
    "pharma_clinical", "pharma_industrial", "biotech",
    "medical_device", "chemicals", "agro_health", "academic_basic",
]


# ---------------------------------------------------------------------------
# _extract_json — no network calls needed
# ---------------------------------------------------------------------------

def test_extract_json_plain():
    raw = '{"domain": "biotech", "trl_score": 4}'
    result = _extract_json(raw)
    assert result["domain"] == "biotech"
    assert result["trl_score"] == 4


def test_extract_json_with_markdown_block():
    raw = '```json\n{"domain": "pharma_clinical", "trl_score": 6}\n```'
    result = _extract_json(raw)
    assert result["trl_score"] == 6


def test_extract_json_with_leading_text():
    raw = 'Here is my analysis:\n{"domain": "chemicals", "trl_score": 3}'
    result = _extract_json(raw)
    assert result["domain"] == "chemicals"


def test_extract_json_raises_on_garbage():
    with pytest.raises(ValueError, match="No valid JSON"):
        _extract_json("This is not JSON at all, no braces here")


# ---------------------------------------------------------------------------
# Domain detection — covers all 7 domains
# ---------------------------------------------------------------------------

DOMAIN_ABSTRACTS = {
    "pharma_clinical": "A randomized controlled trial evaluating compound X in patients with Type 2 diabetes. Phase III, NDA pathway.",
    "pharma_industrial": "GMP-compliant scale-up of API synthesis. ICH Q8 process development with yield optimization.",
    "biotech": "CRISPR-Cas9 gene editing in CHO cell lines for biologic production. CAR-T cell therapy.",
    "medical_device": "510(k) submission for diagnostic IVD device. ISO 13485 quality management system.",
    "chemicals": "REACH-compliant green chemistry synthesis. Atom economy analysis and EPA TSCA regulation.",
    "agro_health": "Biopesticide field trial against crop pests. EFSA authorization and USDA APHIS review.",
    "academic_basic": "Theoretical study of quantum entanglement in photon pairs. Fundamental physics.",
}


@pytest.mark.asyncio
@pytest.mark.parametrize("expected_domain,abstract", DOMAIN_ABSTRACTS.items())
async def test_detect_domain_returns_correct_domain(expected_domain, abstract):
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content=expected_domain))]

    with patch("app.services.llm_analyzer._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        result = await detect_domain(abstract, "")

    assert result == expected_domain


async def test_detect_domain_falls_back_on_unknown_output():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="completely_unknown_domain"))]

    with patch("app.services.llm_analyzer._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        result = await detect_domain("some abstract", "")

    assert result == "academic_basic"


async def test_detect_domain_falls_back_on_exception():
    with patch("app.services.llm_analyzer._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(side_effect=Exception("Network error"))
        result = await detect_domain("any abstract", "")

    assert result == "academic_basic"


def test_domain_system_prompt_lists_all_domains():
    for domain in ALL_DOMAINS:
        assert domain in _DOMAIN_SYSTEM


# ---------------------------------------------------------------------------
# Domain scoring guides — loaded from prompts/{domain}.md
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("domain", ALL_DOMAINS)
def test_domain_guide_loads_and_references_trl(domain):
    guide = _load_domain_guide(domain)
    assert guide.strip(), f"{domain} guide is empty"
    assert "TRL" in guide


def test_unknown_domain_falls_back_to_academic_guide():
    # An unmapped domain must still return a usable guide, not raise.
    guide = _load_domain_guide("nonexistent_domain")
    assert guide.strip()


def test_agro_health_guide_references_regulators():
    guide = _load_domain_guide("agro_health")
    assert "EFSA" in guide
    assert "USDA" in guide


# ---------------------------------------------------------------------------
# AnalysisResult schema validation
# ---------------------------------------------------------------------------

VALID_ANALYSIS = {
    "domain": "pharma_clinical",
    "trl_score": 5,
    "trl_confidence": 72,
    "trl_description": "Phase II clinical trial demonstrated efficacy.",
    "market_evidence": {
        "field_maturity": "growing",
        "market_validation_score": 64,
        "active_trials_in_space": 12,
        "completed_trials_in_space": 30,
        "approved_drugs_in_class": 3,
        "evidence_basis": "30 completed trials, 3 approvals in class",
        "citation_signal": "moderate",
    },
    "risk_level": "medium",
    "risk_score": 55,
    "risk_factors": [
        {"category": "regulatory", "description": "NDA approval timeline uncertain", "severity": "medium"}
    ],
    "key_findings": [
        {"title": "Efficacy", "description": "50% reduction in tumor size", "confidence": 80, "category": "innovation"}
    ],
    "evidence_quality": {
        "level": "rct",
        "score": 75,
        "sample_size_adequacy": "adequate",
        "statistical_rigor": "high",
        "reproducibility_signals": "strong"
    },
    "regulatory_pathway": "FDA NDA → Phase III",
    "regulatory_timeline": "5-7 years",
    "methodology": "experimental",
    "methodology_score": 70,
    "impact_score": 68,
    "novelty_score": 72,
    "tags": ["oncology", "Phase II", "small molecule"],
    "extracted_methods": ["MTT assay", "Western blot"],
    "extracted_claims": ["IC50 reduction", "Caspase-3 activation"],
    "synthesis": "This compound shows strong clinical potential.",
}


def test_analysis_result_validates_correctly():
    result = AnalysisResult(**VALID_ANALYSIS)
    assert result.trl_score == 5
    assert result.domain == "pharma_clinical"
    assert result.market_evidence.market_validation_score == 64


def test_analysis_result_trl_bounds():
    from pydantic import ValidationError
    invalid = {**VALID_ANALYSIS, "trl_score": 0}
    with pytest.raises(ValidationError):
        AnalysisResult(**invalid)

    invalid = {**VALID_ANALYSIS, "trl_score": 10}
    with pytest.raises(ValidationError):
        AnalysisResult(**invalid)


def test_analysis_result_confidence_bounds():
    from pydantic import ValidationError
    invalid = {**VALID_ANALYSIS, "trl_confidence": 101}
    with pytest.raises(ValidationError):
        AnalysisResult(**invalid)


def test_analysis_result_rejects_invalid_domain():
    from pydantic import ValidationError
    invalid = {**VALID_ANALYSIS, "domain": "quantum_computing"}
    with pytest.raises(ValidationError):
        AnalysisResult(**invalid)


def test_analysis_result_rejects_invalid_risk_level():
    from pydantic import ValidationError
    invalid = {**VALID_ANALYSIS, "risk_level": "extreme"}
    with pytest.raises(ValidationError):
        AnalysisResult(**invalid)


def test_analysis_result_agro_health_domain():
    valid_agro = {**VALID_ANALYSIS, "domain": "agro_health"}
    result = AnalysisResult(**valid_agro)
    assert result.domain == "agro_health"


def test_market_evidence_defaults_when_omitted():
    # market_evidence has a default factory — AnalysisResult is valid without it.
    payload = {k: v for k, v in VALID_ANALYSIS.items() if k != "market_evidence"}
    result = AnalysisResult(**payload)
    assert isinstance(result.market_evidence, MarketEvidence)


# ---------------------------------------------------------------------------
# analyze_paper — integration smoke test (mocked LLM, real data context)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_paper_returns_analysis_result():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content=json.dumps(VALID_ANALYSIS)))]

    market_evidence = MarketEvidence(
        field_maturity="growing",
        market_validation_score=64,
        evidence_basis="30 completed trials",
        citation_signal="moderate",
    )
    trl_context = {"field_trl": 6, "trl_evidence": "Multiple Phase II/III trials in space"}

    with patch("app.services.llm_analyzer._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        result = await analyze_paper(
            title="Test Drug Study",
            abstract="Phase II trial of compound X in cancer patients.",
            sections_text="METHODS: RCT with 200 patients.\nRESULTS: Significant response.",
            domain="pharma_clinical",
            enrichment=EnrichmentResult(),
            trl_context=trl_context,
            market_evidence=market_evidence,
        )

    assert isinstance(result, AnalysisResult)
    assert 1 <= result.trl_score <= 9
    # analyze_paper forces the validated domain and injects real market data
    assert result.domain == "pharma_clinical"
    assert result.market_evidence.market_validation_score == 64
