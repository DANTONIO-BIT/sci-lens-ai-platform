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
  tamEstimate: {
    value: number // in billions USD
    currency: string
    breakdown: TamBreakdown[]
  }
  riskLevel: 'low' | 'medium' | 'high'
  riskScore: number // 0-100
  riskFactors: RiskFactor[]
  keyFindings: KeyFinding[]
  methodology: MethodologyType
  methodologyScore: number // 0-100
  citations: number
  impactScore: number // 0-100
  noveltyScore: number // 0-100
  similarPapers: string[] // IDs
  tags: string[]
  analyzedAt: Date
}

export interface TamBreakdown {
  segment: string
  value: number
  percentage: number
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
  totalTamValue: number
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
