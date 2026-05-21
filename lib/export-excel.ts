/**
 * Project Portfolio Excel Export
 * Generates a multi-sheet .xlsx workbook for pharma portfolio review.
 * Uses SheetJS (xlsx) — client-side only.
 */
import type { ProjectPaper, ProjectMetrics, ResearchProject } from './types'

function tamValue(paper: ProjectPaper): number {
  const raw = paper.analysis?.rawJson
  if (raw?.tam_estimate && typeof raw.tam_estimate === 'object') {
    return Number((raw.tam_estimate as Record<string, unknown>).value ?? 0)
  }
  return parseFloat(paper.analysis?.tamEstimate ?? '0') || 0
}

function noveltyScore(paper: ProjectPaper): number {
  return Number((paper.analysis?.rawJson?.novelty_score) ?? 0)
}

function impactScore(paper: ProjectPaper): number {
  return Number((paper.analysis?.rawJson?.impact_score) ?? 0)
}

function methodologyScore(paper: ProjectPaper): number {
  return Number((paper.analysis?.rawJson?.methodology_score) ?? 0)
}

function synthesis(paper: ProjectPaper): string {
  return String(paper.analysis?.rawJson?.synthesis ?? '')
}

function domainLabel(d: string) {
  return d.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export async function exportProjectExcel(
  project: ResearchProject,
  metrics: ProjectMetrics,
  papers: ProjectPaper[],
) {
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()
  const generated = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // -------------------------------------------------------------------------
  // Sheet 1: Summary
  // -------------------------------------------------------------------------
  const summaryData = [
    ['SciLens Portfolio Report'],
    [''],
    ['Project', project.name],
    ['Description', project.description || '—'],
    ['Domain', domainLabel(project.domain)],
    ['Status', project.status.charAt(0).toUpperCase() + project.status.slice(1)],
    ['Generated', generated],
    [''],
    ['── PORTFOLIO METRICS ──'],
    ['Total Papers', metrics.paperCount],
    ['Analyzed Papers', metrics.analyzedCount],
    ['Average TRL Score', metrics.avgTrl],
    ['Total TAM', `$${metrics.totalTamBillions.toFixed(2)}B USD`],
    ['Avg. Novelty Score', `${metrics.avgNoveltyScore}/100`],
    ['Avg. Impact Score', `${metrics.avgImpactScore}/100`],
    ['Avg. Methodology Score', `${metrics.avgMethodologyScore}/100`],
    [''],
    ['── RISK DISTRIBUTION ──'],
    ...Object.entries(metrics.riskDistribution).map(([k, v]) => [
      k.charAt(0).toUpperCase() + k.slice(1) + ' Risk', v,
    ]),
    [''],
    ['── EVIDENCE QUALITY DISTRIBUTION ──'],
    ...Object.entries(metrics.evidenceQualityDistribution).map(([k, v]) => [
      k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), v,
    ]),
    [''],
    ['── REGULATORY PATHWAYS ──'],
    ...metrics.regulatoryPathways.map(p => ['', p]),
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 55 }]

  // Bold first row (title)
  if (wsSummary['A1']) {
    wsSummary['A1'].s = { font: { bold: true, sz: 14 } }
  }

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // -------------------------------------------------------------------------
  // Sheet 2: Papers
  // -------------------------------------------------------------------------
  const papersHeader = [
    '#',
    'Title',
    'Authors',
    'Year',
    'TRL Score',
    'TRL Confidence (%)',
    'TAM ($B USD)',
    'Risk Level',
    'Evidence Quality',
    'Regulatory Pathway',
    'Domain',
    'Novelty Score',
    'Impact Score',
    'Methodology Score',
    'Synthesis',
    'DOI',
  ]

  const papersRows = papers.map((p, i) => {
    const a = p.analysis
    const raw = a?.rawJson ?? {}
    return [
      i + 1,
      p.title,
      p.authors.join('; '),
      p.year ?? '',
      a?.trlLevel ?? '',
      a?.trlLevel ? `${a.trlLevel * 10}` : '',  // rough confidence if not available
      tamValue(p) || '',
      a?.regulatoryComplexity ?? '',
      a?.evidenceQuality?.level?.replace(/_/g, ' ') ?? '',
      a?.regulatoryPathway ?? '',
      domainLabel((raw.domain as string) ?? ''),
      noveltyScore(p) || '',
      impactScore(p) || '',
      methodologyScore(p) || '',
      synthesis(p),
      p.doi ?? '',
    ]
  })

  const wsPapers = XLSX.utils.aoa_to_sheet([papersHeader, ...papersRows])
  wsPapers['!cols'] = [
    { wch: 4 },   // #
    { wch: 55 },  // Title
    { wch: 35 },  // Authors
    { wch: 6 },   // Year
    { wch: 10 },  // TRL
    { wch: 16 },  // TRL Conf
    { wch: 12 },  // TAM
    { wch: 12 },  // Risk
    { wch: 18 },  // Evidence
    { wch: 35 },  // Regulatory
    { wch: 18 },  // Domain
    { wch: 14 },  // Novelty
    { wch: 12 },  // Impact
    { wch: 18 },  // Methodology
    { wch: 60 },  // Synthesis
    { wch: 25 },  // DOI
  ]

  // Freeze first row
  wsPapers['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2' }

  XLSX.utils.book_append_sheet(wb, wsPapers, 'Papers')

  // -------------------------------------------------------------------------
  // Sheet 3: Risk & Evidence Analysis
  // -------------------------------------------------------------------------
  const analysisData: (string | number)[][] = [
    ['Risk Distribution'],
    ['Risk Level', 'Paper Count'],
    ...Object.entries(metrics.riskDistribution).map(([k, v]) => [
      k.charAt(0).toUpperCase() + k.slice(1), v as number,
    ]),
    [''],
    ['Evidence Quality Distribution'],
    ['Evidence Level', 'Paper Count'],
    ...Object.entries(metrics.evidenceQualityDistribution).map(([k, v]) => [
      k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), v as number,
    ]),
    [''],
    ['Score Comparison'],
    ['Metric', 'Average Score'],
    ['TRL Score (×10 for scale)', metrics.avgTrl * 10],
    ['Novelty Score', metrics.avgNoveltyScore],
    ['Impact Score', metrics.avgImpactScore],
    ['Methodology Score', metrics.avgMethodologyScore],
  ]

  const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisData)
  wsAnalysis['!cols'] = [{ wch: 32 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsAnalysis, 'Risk & Evidence')

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------
  const filename = `scilens_${project.name.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}_portfolio.xlsx`
  XLSX.writeFile(wb, filename)
}

// ---------------------------------------------------------------------------
// Light export: all papers from dashboard (no project context)
// ---------------------------------------------------------------------------
export async function exportPapersExcel(
  papers: Array<{
    id: string
    title: string
    authors: string[]
    status: string
    uploadedAt: Date
    analysis?: {
      trlScore: number
      tamEstimate: { value: number }
      riskLevel: string
      evidenceQuality: { level: string }
      domain: string
      noveltyScore: number
      impactScore: number
    }
  }>,
) {
  const XLSX = await import('xlsx')

  const header = [
    'Title', 'Authors', 'TRL Score', 'TAM ($B)', 'Risk Level',
    'Evidence Quality', 'Domain', 'Novelty', 'Impact', 'Status', 'Uploaded',
  ]

  const rows = papers
    .filter(p => p.analysis)
    .map(p => [
      p.title,
      p.authors.join('; '),
      p.analysis?.trlScore ?? '',
      p.analysis?.tamEstimate.value.toFixed(1) ?? '',
      p.analysis?.riskLevel ?? '',
      p.analysis?.evidenceQuality.level.replace(/_/g, ' ') ?? '',
      domainLabel(p.analysis?.domain ?? ''),
      p.analysis?.noveltyScore ?? '',
      p.analysis?.impactScore ?? '',
      p.status,
      p.uploadedAt.toLocaleDateString(),
    ])

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  ws['!cols'] = [
    { wch: 55 }, { wch: 35 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 },
  ]
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2' }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Papers')
  XLSX.writeFile(wb, `scilens_papers_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
