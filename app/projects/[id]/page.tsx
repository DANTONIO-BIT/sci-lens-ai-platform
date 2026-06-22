'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProjectMetricsCards } from '@/components/projects/project-metrics-cards'
import { EvidenceQualityChart } from '@/components/projects/evidence-quality-chart'
import { RegulatoryPanel } from '@/components/projects/regulatory-panel'
import { ProjectPapersTable } from '@/components/projects/project-papers-table'
import { AddPaperDialog } from '@/components/projects/add-paper-dialog'
import {
  getProject, removePaperFromProject, updateProject, ProjectDetailResponse,
} from '@/lib/api'
import { ProjectMetrics, ProjectPaper } from '@/lib/types'
import { ArrowLeft, Plus, Archive, Loader2 } from 'lucide-react'
import { ExportButton } from '@/components/export/export-button'

const DOMAIN_LABELS: Record<string, string> = {
  pharma_clinical: 'Pharma Clinical',
  pharma_industrial: 'Pharma Industrial',
  biotech: 'Biotechnology',
  medical_device: 'Medical Device',
  chemicals: 'Chemicals',
  agro_health: 'Agro-health',
  academic_basic: 'Academic',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const [data, setData] = useState<ProjectDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getProject(id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRemove = async (paperId: string) => {
    await removePaperFromProject(id, paperId)
    load()
  }

  const handleArchive = async () => {
    if (!data) return
    const newStatus = data.project.status === 'active' ? 'archived' : 'active'
    await updateProject(id, { status: newStatus })
    load()
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Project not found.</p>
          <Link href="/projects">
            <Button variant="outline" className="mt-4">Back to Projects</Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  const { project, metrics: rawMetrics, papers: rawPapers } = data

  const metrics: ProjectMetrics = {
    paperCount: rawMetrics.paper_count,
    analyzedCount: rawMetrics.analyzed_count,
    avgTrl: rawMetrics.avg_trl,
    avgMarketScore: rawMetrics.avg_market_score,
    riskDistribution: rawMetrics.risk_distribution,
    evidenceQualityDistribution: rawMetrics.evidence_quality_distribution,
    regulatoryPathways: rawMetrics.regulatory_pathways,
    avgMethodologyScore: rawMetrics.avg_methodology_score,
    avgNoveltyScore: rawMetrics.avg_novelty_score,
    avgImpactScore: rawMetrics.avg_impact_score,
  }

  const papers: ProjectPaper[] = (rawPapers as Array<Record<string, unknown>>).map((p) => {
    const a = p.analysis as Record<string, unknown> | null | undefined
    return {
      id: p.id as string,
      title: p.title as string,
      authors: (p.authors as string[]) ?? [],
      status: p.status as string,
      year: p.year as number | undefined,
      doi: p.doi as string | undefined,
      createdAt: p.created_at as string,
      analysis: a ? {
        trlLevel: a.trl_level as number,
        trlConfidence: a.trl_confidence as number,
        marketScore: (() => {
          const raw = a.raw_json as Record<string, unknown> | undefined
          const me = raw?.market_evidence as Record<string, unknown> | undefined
          return (me?.market_validation_score as number) ?? parseFloat((a.tam_estimate as string) ?? '0') ?? 0
        })(),
        regulatoryComplexity: a.regulatory_complexity as string,
        evidenceQuality: a.evidence_quality as ProjectPaper['analysis'] extends undefined ? never : NonNullable<ProjectPaper['analysis']>['evidenceQuality'],
        regulatoryPathway: a.regulatory_pathway as string,
        rawJson: a.raw_json as Record<string, unknown>,
      } : undefined,
    }
  })

  const existingPaperIds = papers.map((p) => p.id)

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link href="/projects">
              <Button variant="ghost" size="icon" className="mt-0.5">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <Badge variant="outline" className="text-xs">
                  {DOMAIN_LABELS[project.domain] ?? project.domain}
                </Badge>
                {project.status === 'archived' && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Archived</Badge>
                )}
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <ExportButton
              options={[
                {
                  label: 'Excel Portfolio',
                  description: 'All papers with metrics',
                  icon: 'excel',
                  onClick: async () => {
                    const { exportProjectExcel } = await import('@/lib/export-excel')
                    await exportProjectExcel(
                      {
                        id: project.id,
                        name: project.name,
                        description: project.description,
                        domain: project.domain as import('@/lib/types').DomainType,
                        status: project.status as 'active' | 'archived',
                        paperCount: project.paper_count,
                        createdAt: project.created_at,
                      },
                      metrics,
                      papers,
                    )
                  },
                },
              ]}
            />
            <Button variant="outline" size="sm" onClick={handleArchive}>
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              {project.status === 'active' ? 'Archive' : 'Restore'}
            </Button>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Paper
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <ProjectMetricsCards metrics={metrics} />

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <EvidenceQualityChart distribution={metrics.evidenceQualityDistribution} />
          <RegulatoryPanel
            pathways={metrics.regulatoryPathways}
            riskDistribution={metrics.riskDistribution}
          />
        </div>

        {/* Papers table */}
        <ProjectPapersTable papers={papers} onRemove={handleRemove} />
      </div>

      <AddPaperDialog
        projectId={id}
        existingPaperIds={existingPaperIds}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdded={load}
      />
    </AppLayout>
  )
}
