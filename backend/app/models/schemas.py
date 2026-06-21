from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Evidence quality
# ---------------------------------------------------------------------------

class RiskFactor(BaseModel):
    category: Literal["technical", "market", "regulatory", "competitive"]
    description: str
    severity: Literal["low", "medium", "high"]


class KeyFinding(BaseModel):
    title: str
    description: str
    confidence: int = Field(ge=0, le=100)
    category: Literal["innovation", "application", "limitation", "opportunity"]


class EvidenceQuality(BaseModel):
    level: Literal[
        "meta_analysis", "rct", "cohort", "case_control",
        "in_vivo", "in_vitro", "in_silico", "review", "other"
    ]
    score: int = Field(ge=0, le=100)
    sample_size_adequacy: Literal["adequate", "underpowered", "unknown"]
    statistical_rigor: Literal["high", "medium", "low"]
    reproducibility_signals: Literal["strong", "moderate", "weak", "none"]


# ---------------------------------------------------------------------------
# Entity extraction
# ---------------------------------------------------------------------------

class ExtractedEntities(BaseModel):
    compounds: list[str] = []
    targets: list[str] = []
    diseases: list[str] = []
    organisms: list[str] = []
    mechanisms: list[str] = []
    search_terms: list[str] = []


# ---------------------------------------------------------------------------
# Enrichment data (from external APIs)
# ---------------------------------------------------------------------------

class TrialInfo(BaseModel):
    nct_id: str
    title: str
    status: str
    phase: str
    conditions: list[str]
    interventions: list[str]


class ApprovalInfo(BaseModel):
    brand_name: str
    generic_name: str
    application_number: str
    approval_date: str


class EnrichmentResult(BaseModel):
    entities: ExtractedEntities = Field(default_factory=ExtractedEntities)
    semantic_scholar_citations: int = 0
    semantic_scholar_influential_citations: int = 0
    trials: list[TrialInfo] = []
    trial_count_by_phase: dict[str, int] = {}
    total_trials_in_space: int = 0
    approvals: list[ApprovalInfo] = []
    total_approvals_in_space: int = 0
    sources_used: list[str] = []
    enrichment_errors: list[str] = []


# ---------------------------------------------------------------------------
# Market evidence — replaces hallucinated TAM estimates
# ---------------------------------------------------------------------------

class MarketEvidence(BaseModel):
    field_maturity: Literal["nascent", "emerging", "growing", "established", "mature"]
    market_validation_score: int = Field(ge=0, le=100)
    active_trials_in_space: int = 0
    completed_trials_in_space: int = 0
    approved_drugs_in_class: int = 0
    evidence_basis: str = ""
    citation_signal: str = ""


# ---------------------------------------------------------------------------
# Domain / methodology literals
# ---------------------------------------------------------------------------

DomainType = Literal[
    "pharma_clinical", "pharma_industrial", "biotech",
    "medical_device", "chemicals", "agro_health", "academic_basic",
]

MethodologyType = Literal[
    "experimental", "observational", "computational",
    "theoretical", "meta-analysis", "review",
]


# ---------------------------------------------------------------------------
# Full analysis result (returned by LLM + scoring engine)
# ---------------------------------------------------------------------------

class AnalysisResult(BaseModel):
    domain: DomainType
    trl_score: int = Field(ge=1, le=9)
    trl_confidence: int = Field(ge=0, le=100)
    trl_description: str
    market_evidence: MarketEvidence = Field(default_factory=lambda: MarketEvidence(
        field_maturity="nascent", market_validation_score=0
    ))
    risk_level: Literal["low", "medium", "high"]
    risk_score: int = Field(ge=0, le=100)
    risk_factors: list[RiskFactor]
    key_findings: list[KeyFinding]
    evidence_quality: EvidenceQuality
    regulatory_pathway: str = ""
    regulatory_timeline: str = ""
    methodology: MethodologyType
    methodology_score: int = Field(ge=0, le=100)
    impact_score: int = Field(ge=0, le=100)
    novelty_score: int = Field(ge=0, le=100)
    tags: list[str]
    extracted_methods: list[str]
    extracted_claims: list[str]
    synthesis: str
    enrichment: Optional[EnrichmentResult] = None


# ---------------------------------------------------------------------------
# PDF metadata
# ---------------------------------------------------------------------------

class PaperMetadata(BaseModel):
    title: str
    authors: list[str]
    abstract: str
    journal: Optional[str] = None
    year: Optional[int] = None
    doi: Optional[str] = None


# ---------------------------------------------------------------------------
# API shapes
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    paper_id: str
    status: str
    title: str
    authors: list[str]


class PaperStatus(BaseModel):
    paper_id: str
    status: Literal["processing", "analyzed", "failed"]
    title: Optional[str] = None


class ConnectionsResponse(BaseModel):
    nodes: list[dict]
    links: list[dict]


class PaperStats(BaseModel):
    total_papers: int
    analyzed_papers: int
    avg_trl_score: float
    total_tam_value: float
    high_risk_count: int
    domain_distribution: dict[str, int]
    evidence_distribution: dict[str, int]


# ---------------------------------------------------------------------------
# Research project portfolio
# ---------------------------------------------------------------------------

class CreateProjectRequest(BaseModel):
    name: str
    description: str = ""
    domain: str = "pharma_clinical"


class UpdateProjectRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    domain: str
    status: str
    created_at: str
    paper_count: int = 0


class ProjectMetrics(BaseModel):
    paper_count: int = 0
    analyzed_count: int = 0
    avg_trl: float = 0.0
    total_tam_billions: float = 0.0
    risk_distribution: dict[str, int] = {}
    evidence_quality_distribution: dict[str, int] = {}
    regulatory_pathways: list[str] = []
    avg_methodology_score: float = 0.0
    avg_novelty_score: float = 0.0
    avg_impact_score: float = 0.0


class ProjectDetailResponse(BaseModel):
    project: ProjectResponse
    metrics: ProjectMetrics
    papers: list[dict]
