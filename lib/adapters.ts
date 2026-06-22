import type { Paper, Analysis, MarketEvidence } from './types'

type RawAnalysis = {
  trl_level?: number | null
  trl_confidence?: number | null
  tam_estimate?: string | null
  regulatory_complexity?: string | null
  raw_json?: Record<string, unknown> | null
} | null

// Map the backend MarketEvidence (snake_case) into the camelCase frontend shape.
const adaptMarketEvidence = (
  me: Record<string, unknown> | undefined,
  fallbackScore: number,
): MarketEvidence => ({
  fieldMaturity: (me?.field_maturity as MarketEvidence['fieldMaturity']) ?? 'nascent',
  marketValidationScore: Number(me?.market_validation_score ?? fallbackScore) || 0,
  activeTrialsInSpace: Number(me?.active_trials_in_space ?? 0) || 0,
  completedTrialsInSpace: Number(me?.completed_trials_in_space ?? 0) || 0,
  approvedDrugsInClass: Number(me?.approved_drugs_in_class ?? 0) || 0,
  evidenceBasis: String(me?.evidence_basis ?? ''),
  citationSignal: String(me?.citation_signal ?? ''),
})

export const adaptAnalysis = (a: RawAnalysis): Analysis | undefined => {
  if (!a) return undefined
  const raw = (a.raw_json ?? {}) as Record<string, unknown>
  const trl = a.trl_level ?? (raw.trl_score as number) ?? 0

  const meRaw = raw.market_evidence as Record<string, unknown> | undefined
  return {
    trlScore: trl,
    trlConfidence: (raw.trl_confidence as number) ?? (a.trl_confidence as number) ?? 0,
    trlDescription: (raw.trl_description as string) ?? '',
    marketEvidence: adaptMarketEvidence(meRaw, parseFloat(a.tam_estimate ?? '0') || 0),
    riskLevel: (a.regulatory_complexity as Analysis['riskLevel']) ?? (raw.risk_level as Analysis['riskLevel']) ?? 'medium',
    riskScore: (raw.risk_score as number) ?? 0,
    riskFactors: (raw.risk_factors as Analysis['riskFactors']) ?? [],
    keyFindings: (raw.key_findings as Analysis['keyFindings']) ?? [],
    evidenceQuality: (raw.evidence_quality as Analysis['evidenceQuality']) ?? {
      level: 'other', score: 0, sampleSizeAdequacy: 'unknown', statisticalRigor: 'low', reproducibilitySignals: 'none',
    },
    domain: (raw.domain as string) ?? '',
    regulatoryPathway: (raw.regulatory_pathway as string) ?? '',
    regulatoryTimeline: (raw.regulatory_timeline as string) ?? '',
    methodology: (raw.methodology as Analysis['methodology']) ?? 'experimental',
    methodologyScore: (raw.methodology_score as number) ?? 0,
    citations: 0,
    impactScore: (raw.impact_score as number) ?? 0,
    noveltyScore: (raw.novelty_score as number) ?? 0,
    similarPapers: [],
    tags: (raw.tags as string[]) ?? [],
    analyzedAt: new Date(),
  }
}

export const adaptApiPaper = (p: {
  id: string
  title: string
  authors: string[]
  status: string
  created_at: string
  file_name: string
  analysis?: RawAnalysis
}): Paper => ({
  id: p.id,
  title: p.title,
  authors: p.authors ?? [],
  abstract: '',
  uploadedAt: new Date(p.created_at),
  status: (p.status as Paper['status']) ?? 'processing',
  analysis: adaptAnalysis(p.analysis ?? null),
})
