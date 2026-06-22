// SciLens Type Definitions

export interface Paper {
  id: string
  title: string
  authors: string[]
  abstract: string
  journal?: string
  year?: number
  doi?: string
  uploadedAt: Date
  status: 'processing' | 'analyzed' | 'failed'
  analysis?: Analysis
}

export interface Analysis {
  trlScore: number // 1-9 Technology Readiness Level
  trlConfidence: number // 0-100
  trlDescription: string
  marketEvidence: MarketEvidence
  riskLevel: 'low' | 'medium' | 'high'
  riskScore: number // 0-100
  riskFactors: RiskFactor[]
  keyFindings: KeyFinding[]
  evidenceQuality: EvidenceQuality
  domain: string
  regulatoryPathway: string
  regulatoryTimeline: string
  methodology: MethodologyType
  methodologyScore: number // 0-100
  citations: number
  impactScore: number // 0-100
  noveltyScore: number // 0-100
  similarPapers: string[] // IDs
  tags: string[]
  analyzedAt: Date
}

export interface EvidenceQuality {
  level: 'meta_analysis' | 'rct' | 'cohort' | 'case_control' | 'in_vivo' | 'in_vitro' | 'in_silico' | 'review' | 'other'
  score: number // 0-100
  sampleSizeAdequacy: 'adequate' | 'underpowered' | 'unknown'
  statisticalRigor: 'high' | 'medium' | 'low'
  reproducibilitySignals: 'strong' | 'moderate' | 'weak' | 'none'
}

// Market validation evidence — derived from real clinical trial, FDA approval
// and citation data (replaces the old AI-hallucinated dollar TAM).
export interface MarketEvidence {
  fieldMaturity: 'nascent' | 'emerging' | 'growing' | 'established' | 'mature'
  marketValidationScore: number // 0-100
  activeTrialsInSpace: number
  completedTrialsInSpace: number
  approvedDrugsInClass: number
  evidenceBasis: string
  citationSignal: string
}

export interface RiskFactor {
  category: 'technical' | 'market' | 'regulatory' | 'competitive'
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface KeyFinding {
  title: string
  description: string
  confidence: number // 0-100
  category: 'innovation' | 'application' | 'limitation' | 'opportunity'
}

export type MethodologyType = 
  | 'experimental'
  | 'observational'
  | 'computational'
  | 'theoretical'
  | 'meta-analysis'
  | 'review'

export interface GraphNode {
  id: string
  label: string
  cluster: string
  clusterColor: string
  relevance: number // 0-100, affects node size
  x?: number
  y?: number
  connections: string[]
  paper?: Paper
}

export interface GraphLink {
  source: string
  target: string
  strength: number // 0-1
  type: 'citation' | 'semantic' | 'author'
}

export interface GraphCluster {
  id: string
  name: string
  color: string
  nodeCount: number
}

export interface DashboardStats {
  totalPapers: number
  analyzedPapers: number
  avgTrlScore: number
  avgMarketScore: number // 0-100
  highRiskCount: number
  recentActivity: ActivityItem[]
}

export interface ActivityItem {
  id: string
  type: 'upload' | 'analysis' | 'view' | 'export'
  paperId?: string
  paperTitle?: string
  timestamp: Date
  description: string
}

export interface UploadState {
  file: File | null
  status: 'idle' | 'uploading' | 'parsing' | 'analyzing' | 'complete' | 'error'
  progress: number // 0-100
  currentStep: number // 1-4
  error?: string
  paperId?: string
}

// Chart data types for Recharts
export interface RadarDataPoint {
  category: string
  value: number
  fullMark: number
}

export interface TimeSeriesPoint {
  date: string
  value: number
  label?: string
}

// ---------------------------------------------------------------------------
// Research Project Portfolio
// ---------------------------------------------------------------------------

export type DomainType =
  | 'pharma_clinical'
  | 'pharma_industrial'
  | 'biotech'
  | 'medical_device'
  | 'chemicals'
  | 'agro_health'
  | 'academic_basic'

export interface ResearchProject {
  id: string
  name: string
  description: string
  domain: DomainType
  status: 'active' | 'archived'
  paperCount: number
  createdAt: string
}

export interface ProjectMetrics {
  paperCount: number
  analyzedCount: number
  avgTrl: number
  avgMarketScore: number // 0-100
  riskDistribution: Record<string, number>
  evidenceQualityDistribution: Record<string, number>
  regulatoryPathways: string[]
  avgMethodologyScore: number
  avgNoveltyScore: number
  avgImpactScore: number
}

export interface ProjectPaper {
  id: string
  title: string
  authors: string[]
  status: string
  year?: number
  doi?: string
  createdAt: string
  analysis?: {
    trlLevel: number
    trlConfidence: number
    marketScore: number // 0-100
    regulatoryComplexity: string
    evidenceQuality?: EvidenceQuality
    regulatoryPathway: string
    rawJson?: Record<string, unknown>
  }
}

export interface ProjectDetail {
  project: ResearchProject
  metrics: ProjectMetrics
  papers: ProjectPaper[]
}
