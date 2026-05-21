"""
Tests for Pydantic schemas — validates the data contract between LLM output and DB.
"""
import pytest
from pydantic import ValidationError
from app.models.schemas import (
    AnalysisResult,
    PaperMetadata,
    ProjectResponse,
    ProjectMetrics,
    CreateProjectRequest,
    UpdateProjectRequest,
    EvidenceQuality,
    TamEstimate,
    TamBreakdown,
    RiskFactor,
    KeyFinding,
)


# ---------------------------------------------------------------------------
# EvidenceQuality
# ---------------------------------------------------------------------------

def test_evidence_quality_valid_levels():
    valid_levels = [
        "meta_analysis", "rct", "cohort", "case_control",
        "in_vivo", "in_vitro", "in_silico", "review", "other"
    ]
    for level in valid_levels:
        eq = EvidenceQuality(
            level=level, score=50,
            sample_size_adequacy="unknown",
            statistical_rigor="medium",
            reproducibility_signals="none",
        )
        assert eq.level == level


def test_evidence_quality_rejects_invalid_level():
    with pytest.raises(ValidationError):
        EvidenceQuality(
            level="field_trial",  # not in the enum — agro uses in_vivo for animal/field equivalent
            score=50,
            sample_size_adequacy="unknown",
            statistical_rigor="medium",
            reproducibility_signals="none",
        )


def test_evidence_quality_score_bounds():
    with pytest.raises(ValidationError):
        EvidenceQuality(level="rct", score=101, sample_size_adequacy="adequate",
                        statistical_rigor="high", reproducibility_signals="strong")


# ---------------------------------------------------------------------------
# TamEstimate + TamBreakdown
# ---------------------------------------------------------------------------

def test_tam_estimate_valid():
    tam = TamEstimate(
        value=25.0, currency="USD",
        breakdown=[TamBreakdown(segment="US", value=15.0, percentage=60)]
    )
    assert tam.value == 25.0


def test_tam_breakdown_valid():
    bd = TamBreakdown(segment="EU oncology", value=8.5, percentage=34)
    assert bd.segment == "EU oncology"


# ---------------------------------------------------------------------------
# RiskFactor + KeyFinding
# ---------------------------------------------------------------------------

def test_risk_factor_valid_categories():
    for cat in ["technical", "market", "regulatory", "competitive"]:
        rf = RiskFactor(category=cat, description="Test risk", severity="medium")
        assert rf.category == cat


def test_risk_factor_rejects_invalid_category():
    with pytest.raises(ValidationError):
        RiskFactor(category="geopolitical", description="War risk", severity="high")


def test_key_finding_confidence_bounds():
    with pytest.raises(ValidationError):
        KeyFinding(title="X", description="Y", confidence=150, category="innovation")


# ---------------------------------------------------------------------------
# PaperMetadata
# ---------------------------------------------------------------------------

def test_paper_metadata_defaults():
    meta = PaperMetadata(title="Test Paper", authors=["Author A"], abstract="Some text")
    assert meta.doi is None
    assert meta.year is None
    assert meta.journal is None


def test_paper_metadata_with_doi():
    meta = PaperMetadata(
        title="Paper", authors=["A"], abstract="Abstract",
        doi="10.1234/example"
    )
    assert meta.doi == "10.1234/example"


# ---------------------------------------------------------------------------
# ProjectResponse + ProjectMetrics
# ---------------------------------------------------------------------------

def test_project_response_default_paper_count():
    proj = ProjectResponse(
        id="abc", name="My Project", description="",
        domain="pharma_clinical", status="active",
        created_at="2026-01-01T00:00:00+00:00",
    )
    assert proj.paper_count == 0


def test_project_metrics_defaults():
    m = ProjectMetrics()
    assert m.paper_count == 0
    assert m.avg_trl == 0.0
    assert m.risk_distribution == {}
    assert m.regulatory_pathways == []


# ---------------------------------------------------------------------------
# CreateProjectRequest / UpdateProjectRequest
# ---------------------------------------------------------------------------

def test_create_project_request_defaults():
    req = CreateProjectRequest(name="New Project")
    assert req.description == ""
    assert req.domain == "pharma_clinical"


def test_update_project_all_none_is_valid():
    req = UpdateProjectRequest()
    assert req.name is None
    assert req.description is None
    assert req.status is None
