'use client'

import * as React from 'react'
import { use } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Calendar, Users, BookOpen, ExternalLink, Share2, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import {
  TrlGauge,
  TamCard,
  RiskPanel,
  KeyFindings,
  AnalysisRadarChart,
  MethodologyBadge,
} from '@/components/analysis'
import { ExportButton } from '@/components/export/export-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getPaperById } from '@/lib/mock-data'
import { getPaper } from '@/lib/api'
import type { Paper, Analysis, EvidenceQuality } from '@/lib/types'

interface AnalysisPageProps {
  params: Promise<{ id: string }>
}

// ---------------------------------------------------------------------------
// Adapter: map backend raw_json → frontend Analysis type
// ---------------------------------------------------------------------------
const adaptApiAnalysis = (raw: Record<string, unknown>): Analysis => {
  const eq = raw.evidence_quality as Record<string, unknown> | undefined
  return {
    trlScore: (raw.trl_score as number) ?? 1,
    trlConfidence: (raw.trl_confidence as number) ?? 50,
    trlDescription: (raw.trl_description as string) ?? '',
    tamEstimate: raw.tam_estimate as Analysis['tamEstimate'] ?? { value: 0, currency: 'USD', breakdown: [] },
    riskLevel: (raw.risk_level as Analysis['riskLevel']) ?? 'medium',
    riskScore: (raw.risk_score as number) ?? 50,
    riskFactors: (raw.risk_factors as Analysis['riskFactors']) ?? [],
    keyFindings: (raw.key_findings as Analysis['keyFindings']) ?? [],
    evidenceQuality: eq ? {
      level: (eq.level as EvidenceQuality['level']) ?? 'other',
      score: (eq.score as number) ?? 50,
      sampleSizeAdequacy: (eq.sample_size_adequacy as EvidenceQuality['sampleSizeAdequacy']) ?? 'unknown',
      statisticalRigor: (eq.statistical_rigor as EvidenceQuality['statisticalRigor']) ?? 'medium',
      reproducibilitySignals: (eq.reproducibility_signals as EvidenceQuality['reproducibilitySignals']) ?? 'none',
    } : {
      level: 'other' as const,
      score: 50,
      sampleSizeAdequacy: 'unknown' as const,
      statisticalRigor: 'medium' as const,
      reproducibilitySignals: 'none' as const,
    },
    domain: (raw.domain as string) ?? 'academic_basic',
    regulatoryPathway: (raw.regulatory_pathway as string) ?? '',
    regulatoryTimeline: (raw.regulatory_timeline as string) ?? '',
    methodology: (raw.methodology as Analysis['methodology']) ?? 'experimental',
    methodologyScore: (raw.methodology_score as number) ?? 70,
    citations: 0,
    impactScore: (raw.impact_score as number) ?? 50,
    noveltyScore: (raw.novelty_score as number) ?? 50,
    similarPapers: [],
    tags: (raw.tags as string[]) ?? [],
    analyzedAt: new Date(),
  }
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = use(params)

  const [paper, setPaper] = React.useState<Paper | null>(null)
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null)
  const [rawJson, setRawJson] = React.useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const load = async () => {
      // Try real backend first
      try {
        const detail = await getPaper(id)
        if (detail.paper) {
          setPaper({
            id: detail.paper.id,
            title: detail.paper.title,
            authors: detail.paper.authors ?? [],
            abstract: detail.paper.abstract ?? '',
            journal: detail.paper.journal,
            year: detail.paper.year,
            doi: detail.paper.doi,
            uploadedAt: new Date(detail.paper.created_at),
            status: detail.paper.status as Paper['status'],
          })
          if (detail.analysis?.raw_json) {
            const rj = detail.analysis.raw_json as Record<string, unknown>
            setAnalysis(adaptApiAnalysis(rj))
            setRawJson(rj)
          }
          setIsLoading(false)
          return
        }
      } catch {
        // fallthrough to mock
      }

      // Fallback: mock data (demo mode or paper-001..006)
      const mockPaper = getPaperById(id)
      if (mockPaper) {
        setPaper(mockPaper)
        setAnalysis(mockPaper.analysis ?? null)
      }
      setIsLoading(false)
    }
    load()
  }, [id])

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (!paper || !analysis) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">Paper not found or analysis not ready yet.</p>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-tight max-w-3xl text-balance">
                {paper.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                {paper.authors.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {paper.authors.slice(0, 3).join(', ')}
                    {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
                  </div>
                )}
                {paper.journal && (
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    {paper.journal}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Analyzed {formatDistanceToNow(analysis.analyzedAt, { addSuffix: true })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <MethodologyBadge
                  methodology={analysis.methodology}
                  score={analysis.methodologyScore}
                />
                {analysis.citations > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-sm text-muted-foreground">
                      {analysis.citations} citations
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ExportButton
              options={[
                {
                  label: 'PDF Report',
                  description: 'Full analysis for stakeholders',
                  icon: 'pdf',
                  onClick: async () => {
                    const { exportPaperPDF } = await import('@/lib/export-pdf')
                    await exportPaperPDF(paper!, analysis!, rawJson.synthesis as string | undefined)
                  },
                },
              ]}
            />
            {paper.doi && (
              <Button variant="outline" size="sm" asChild>
                <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Paper
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Tags */}
        {analysis.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {analysis.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Main metrics */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TrlGauge
            score={analysis.trlScore}
            confidence={analysis.trlConfidence}
            description={analysis.trlDescription}
          />
          <TamCard tamEstimate={analysis.tamEstimate} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <RiskPanel
            riskLevel={analysis.riskLevel}
            riskScore={analysis.riskScore}
            riskFactors={analysis.riskFactors}
          />
          <AnalysisRadarChart analysis={analysis} />
        </div>

        <KeyFindings findings={analysis.keyFindings} />

        {/* Abstract */}
        {paper.abstract && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Abstract</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{paper.abstract}</p>
            </CardContent>
          </Card>
        )}

        {/* Similar papers (mock only for now) */}
        {analysis.similarPapers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Related Research</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {analysis.similarPapers.map((relatedId) => {
                  const related = getPaperById(relatedId)
                  if (!related) return null
                  return (
                    <Link key={relatedId} href={`/analysis/${relatedId}`}>
                      <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <h4 className="font-medium text-sm line-clamp-2">{related.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {related.authors.slice(0, 2).join(', ')}
                        </p>
                        {related.analysis && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px]">
                              TRL {related.analysis.trlScore}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ${related.analysis.tamEstimate.value.toFixed(1)}B TAM
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
