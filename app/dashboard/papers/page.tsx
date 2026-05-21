'use client'

import * as React from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Search, Filter } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { ExportButton } from '@/components/export/export-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { listPapers } from '@/lib/api'
import { adaptApiPaper } from '@/lib/adapters'
import type { Paper } from '@/lib/types'

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

function getTrlColor(score: number): string {
  if (score >= 7) return 'bg-trl-high/15 text-trl-high'
  if (score >= 4) return 'bg-trl-mid/15 text-trl-mid'
  return 'bg-trl-low/15 text-trl-low'
}

function getRiskColor(level: string): string {
  switch (level) {
    case 'low': return 'bg-trl-high/15 text-trl-high'
    case 'medium': return 'bg-trl-mid/15 text-trl-mid'
    case 'high': return 'bg-trl-low/15 text-trl-low'
    default: return 'bg-muted text-muted-foreground'
  }
}

export default function PapersPage() {
  const [papers, setPapers] = React.useState<Paper[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [riskFilter, setRiskFilter] = React.useState<string>('all')

  React.useEffect(() => {
    const load = async () => {
      try {
        const resp = await listPapers()
        if (resp.papers && resp.papers.length > 0) {
          setPapers(resp.papers.map(adaptApiPaper))
        } else if (isDemoMode) {
          const { mockPapers, processingPapers } = await import('@/lib/mock-data')
          setPapers([...mockPapers, ...processingPapers])
        }
      } catch {
        if (isDemoMode) {
          const { mockPapers, processingPapers } = await import('@/lib/mock-data')
          setPapers([...mockPapers, ...processingPapers])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = papers.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (riskFilter !== 'all' && p.analysis?.riskLevel !== riskFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const matchTitle = p.title.toLowerCase().includes(q)
      const matchAuthor = p.authors.some(a => a.toLowerCase().includes(q))
      const matchTag = p.analysis?.tags?.some(t => t.toLowerCase().includes(q))
      if (!matchTitle && !matchAuthor && !matchTag) return false
    }
    return true
  })

  if (loading) {
    return (
      <AppLayout title="All Papers">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Paper Library</h1>
              <p className="text-muted-foreground">Browse and filter all analyzed papers</p>
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="All Papers">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Paper Library</h1>
            <p className="text-muted-foreground">Browse and filter all analyzed papers</p>
          </div>
          <ExportButton
            options={[
              {
                label: 'Excel Export',
                description: `${papers.filter(p => p.analysis).length} analyzed papers`,
                icon: 'excel',
                onClick: async () => {
                  const { exportPapersExcel } = await import('@/lib/export-excel')
                  await exportPapersExcel(papers.filter(p => p.analysis))
                },
              },
            ]}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, author, or tag..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="analyzed">Analyzed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risks</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="text-sm text-muted-foreground">
          {filtered.length} paper{filtered.length !== 1 ? 's' : ''} found
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {papers.length === 0 ? 'No papers uploaded yet.' : 'No papers match your filters.'}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                {papers.length === 0 ? (
                  <Link href="/upload">
                    <Button>Upload your first paper</Button>
                  </Link>
                ) : (
                  <Button
                    variant="link"
                    onClick={() => { setSearch(''); setStatusFilter('all'); setRiskFilter('all') }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(paper => (
              <Link key={paper.id} href={`/analysis/${paper.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* TRL Badge */}
                      {paper.analysis !== undefined && (
                        <div className="flex flex-col items-center shrink-0">
                          <Badge className={cn('text-lg font-mono font-bold px-3 py-1', getTrlColor(paper.analysis.trlScore))}>
                            {paper.analysis.trlScore}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground mt-1 uppercase">TRL</span>
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium leading-snug line-clamp-1">{paper.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {paper.authors.slice(0, 3).join(', ')}
                          {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
                        </p>
                        {paper.analysis !== undefined && (
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <Badge variant="outline" className={cn('text-xs', getRiskColor(paper.analysis.riskLevel))}>
                              {paper.analysis.riskLevel} risk
                            </Badge>
                            <span className="text-sm font-mono text-muted-foreground">
                              ${paper.analysis.tamEstimate.value.toFixed(1)}B TAM
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Impact: {paper.analysis.impactScore}/100
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Novelty: {paper.analysis.noveltyScore}/100
                            </span>
                            {paper.analysis.domain && (
                              <Badge variant="secondary" className="text-xs">
                                {paper.analysis.domain.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        )}
                        {paper.status === 'processing' && (
                          <Badge variant="outline" className="mt-2 text-xs">Processing...</Badge>
                        )}
                        {paper.status === 'failed' && (
                          <Badge variant="destructive" className="mt-2 text-xs">Failed</Badge>
                        )}
                      </div>

                      {/* Date */}
                      <div className="shrink-0 text-right">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(paper.uploadedAt, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
