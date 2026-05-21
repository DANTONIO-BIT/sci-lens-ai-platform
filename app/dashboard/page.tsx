'use client'

import * as React from 'react'
import { AppLayout } from '@/components/layout'
import {
  StatsCards,
  RecentPapers,
  ActivityFeed,
  QuickActions,
  TrlDistributionChart,
} from '@/components/dashboard'
import { mockPapers, processingPapers, mockDashboardStats } from '@/lib/mock-data'
import { listPapers, getPaperStats } from '@/lib/api'
import type { Paper, Analysis, DashboardStats } from '@/lib/types'

type RawAnalysis = {
  trl_level?: number | null
  tam_estimate?: string | null
  regulatory_complexity?: string | null
  raw_json?: Record<string, unknown> | null
} | null

const adaptAnalysis = (a: RawAnalysis): Analysis | undefined => {
  if (!a) return undefined
  const raw = (a.raw_json ?? {}) as Record<string, unknown>
  const trl = a.trl_level ?? (raw.trl_score as number) ?? 0
  if (!trl) return undefined

  const tamRaw = raw.tam_estimate as Record<string, unknown> | undefined
  return {
    trlScore: trl,
    trlConfidence: (raw.trl_confidence as number) ?? 0,
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

const adaptApiPaper = (p: {
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

export default function DashboardPage() {
  const [papers, setPapers] = React.useState<Paper[]>([...mockPapers, ...processingPapers])
  const [stats, setStats] = React.useState<DashboardStats>(mockDashboardStats)

  React.useEffect(() => {
    const load = async () => {
      try {
        // Try real stats first
        const apiStats = await getPaperStats()
        if (apiStats.total_papers > 0) {
          setStats({
            totalPapers: apiStats.total_papers,
            analyzedPapers: apiStats.analyzed_papers,
            avgTrlScore: apiStats.avg_trl_score,
            totalTamValue: apiStats.total_tam_value,
            highRiskCount: apiStats.high_risk_count,
            recentActivity: [],
          })
        }
      } catch {
        // Backend unavailable — keep mock stats
      }

      try {
        const resp = await listPapers()
        if (resp.papers && resp.papers.length > 0) {
          const realPapers = resp.papers.map(adaptApiPaper)
          setPapers(realPapers)

          // Update activity from real papers
          setStats(prev => ({
            ...prev,
            recentActivity: realPapers.slice(0, 5).map((p, i) => ({
              id: `act-${i}`,
              type: (p.status === 'analyzed' ? 'analysis' : 'upload') as 'analysis' | 'upload',
              paperId: p.id,
              paperTitle: p.title,
              timestamp: p.uploadedAt,
              description: p.status === 'analyzed' ? 'Analysis completed' : 'Paper uploaded',
            })),
          }))
        }
      } catch {
        // Backend unavailable — show demo mock data
      }
    }
    load()
  }, [])

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <StatsCards stats={stats} />
        <div className="grid gap-6 lg:grid-cols-3">
          <RecentPapers papers={papers} />
          <div className="space-y-6">
            <QuickActions />
            <TrlDistributionChart papers={papers.filter(p => p.status === 'analyzed')} />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <ActivityFeed activities={stats.recentActivity} />
        </div>
      </div>
    </AppLayout>
  )
}
