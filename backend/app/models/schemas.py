from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Sub-models (mirror TypeScript types in lib/types.ts)
# ---------------------------------------------------------------------------

class TamBreakdown(BaseModel):
    segment: str
    value: float
    percentage: float


class TamEstimate(BaseModel):
    value: float  # billions USD
    currency: str = "USD"
    breakdown: list[TamBreakdown]


class RiskFactor(BaseModel):
    category: Literal["technical", "market", "regulatory", "competitive"]
    description: str
    severity: Literal["low", "medium", "high"]


class KeyFinding(BaseModel):
    title: str
    description: str
    confidence: int = Field(ge=0, le=100)
    category: Literal["innovation", "application", "limitation", "opportunity"]


MethodologyType = Literal[
    "experimental",
    "observational",
    "computational",
    "theoretical",
    "meta-analysis",
    "review",
]


# ---------------------------------------------------------------------------
# Full analysis — returned by LLM, stored in paper_analysis table
# ---------------------------------------------------------------------------

class AnalysisResult(BaseModel):
    trl_score: int = Field(ge=1, le=9)
    trl_confidence: int = Field(ge=0, le=100)
    trl_description: str
    tam_estimate: TamEstimate
    risk_level: Literal["low", "medium", "high"]
    risk_score: int = Field(ge=0, le=100)
    risk_factors: list[RiskFactor]
    key_findings: list[KeyFinding]
    methodology: MethodologyType
    methodology_score: int = Field(ge=0, le=100)
    impact_score: int = Field(ge=0, le=100)
    novelty_score: int = Field(ge=0, le=100)
    tags: list[str]
    extracted_methods: list[str]
    extracted_claims: list[str]
    synthesis: str  # one-paragraph AI summary


# ---------------------------------------------------------------------------
# Extracted metadata from PDF
# ---------------------------------------------------------------------------

class PaperMetadata(BaseModel):
    title: str
    authors: list[str]
    abstract: str
    journal: Optional[str] = None
    year: Optional[int] = None
    doi: Optional[str] = None


# ---------------------------------------------------------------------------
# API request / response shapes
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    paper_id: str
    status: str
    title: str
    authors: list[str]


class AnalyzeResponse(BaseModel):
    paper_id: str
    status: str
    analysis: AnalysisResult


class PaperStatus(BaseModel):
    paper_id: str
    status: Literal["processing", "analyzed", "failed"]
    title: Optional[str] = None


class ConnectionsResponse(BaseModel):
    nodes: list[dict]
    links: list[dict]
