import type { Paper, Analysis } from './types'

type RawAnalysis = {
  trl_level?: number | null
  trl_confidence?: number | null
  tam_estimate?: string | null
  regulatory_complexity?: string | null
  raw_json?: Record<string, unknown> | null
} | null

export const adaptAnalysis = (a: RawAnalysis): Analysis | undefined => {
  if (!a) return undefined
  const raw = (a.raw_json ?? {}) as Record<string, unknown>
  const trl = a.trl_level ?? (raw.trl_score as number) ?? 0

  const tamRaw = raw.tam_estimate as Record<string, unknown> | undefined
  return {
    trlScore: trl,
    trlConfidence: (raw.trl_confidence as number) ?? (a.trl_confidence as number) ?? 0,
    trlDescription: (raw.trl_description as string) ?? '',
    tamEstimate: tamRaw
      ? { value: Number(tamRaw.value ?? 0), currency: String(tamRaw.currency ?? 'USD'), breakdown: (tamRaw.breakdown as Analysis['tamEstimate']['breakdown']) ?? [] }
      : { value: parseFloat(a.tam_estimate ?? '0') || 0, currency: 'USD', breakdown: [] },
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
