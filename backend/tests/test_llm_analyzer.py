"""
Tests for llm_analyzer service.
- Domain detection logic (mocked LLM calls)
- JSON extraction helper
- AnalysisResult schema validation
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.llm_analyzer import (
    _extract_json,
    DOMAIN_PROMPTS,
    DOMAIN_DETECTION_PROMPT,
    detect_domain,
    analyze_paper,
)
from app.models.schemas import AnalysisResult


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


@pytest.mark.asyncio
async def test_detect_domain_falls_back_on_unknown_output():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="completely_unknown_domain"))]

    with patch("app.services.llm_analyzer._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        result = await detect_domain("some abstract", "")

    assert result == "academic_basic"


@pytest.mark.asyncio
async def test_detect_domain_falls_back_on_exception():
    with patch("app.services.llm_analyzer._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(side_effect=Exception("Network error"))
        result = await detect_domain("any abstract", "")

    assert result == "academic_basic"


# ---------------------------------------------------------------------------
# Domain prompts — structural completeness
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("domain", list(DOMAIN_PROMPTS.keys()))
def test_domain_prompt_references_trl(domain):
    assert "trl_score" in DOMAIN_PROMPTS[domain]


@pytest.mark.parametrize("domain", list(DOMAIN_PROMPTS.keys()))
def test_domain_prompt_references_tam(domain):
    assert "tam_estimate" in DOMAIN_PROMPTS[domain]


@pytest.mark.parametrize("domain", list(DOMAIN_PROMPTS.keys()))
def test_domain_prompt_references_evidence_quality(domain):
    assert "evidence_quality" in DOMAIN_PROMPTS[domain]


def test_agro_health_prompt_references_efsa():
    assert "EFSA" in DOMAIN_PROMPTS["agro_health"]


def test_agro_health_prompt_references_usda():
    assert "USDA" in DOMAIN_PROMPTS["agro_health"]


def test_agro_health_prompt_has_trl_context():
    assert "multi-location field trial" in DOMAIN_PROMPTS["agro_health"]


def test_all_7_domains_have_prompts():
    expected = {"pharma_clinical", "pharma_industrial", "biotech", "medical_device",
                "chemicals", "agro_health", "academic_basic"}
    assert set(DOMAIN_PROMPTS.keys()) == expected


# ---------------------------------------------------------------------------
# AnalysisResult schema validation
# ---------------------------------------------------------------------------

VALID_ANALYSIS = {
    "domain": "pharma_clinical",
    "trl_score": 5,
    "trl_confidence": 72,
    "trl_description": "Phase II clinical trial demonstrated efficacy.",
    "tam_estimate": {"value": 12.5, "currency": "USD", "breakdown": [
        {"segment": "US oncology market", "value": 8.0, "percentage": 64}
    ]},
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


# ---------------------------------------------------------------------------
# analyze_paper — integration smoke test (mocked LLM)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_paper_returns_analysis_result():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content=json.dumps(VALID_ANALYSIS)))]

    with patch("app.services.llm_analyzer._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        result = await analyze_paper(
            title="Test Drug Study",
            abstract="Phase II trial of compound X in cancer patients.",
            sections_text="METHODS: RCT with 200 patients.\nRESULTS: Significant response.",
            domain="pharma_clinical",
        )

    assert isinstance(result, AnalysisResult)
    assert 1 <= result.trl_score <= 9
