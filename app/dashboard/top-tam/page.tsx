'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listPapers } from '@/lib/api'
import { adaptApiPaper } from '@/lib/adapters'
import type { Paper } from '@/lib/types'

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

export default function TopMarketPage() {
  const [papers, setPapers] = React.useState<Paper[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    listPapers()
      .then(resp => { if (resp.papers?.length) setPapers(resp.papers.map(adaptApiPaper)) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sorted = React.useMemo(
    () => [...papers]
      .filter(p => p.analysis && p.analysis.marketEvidence.marketValidationScore > 0)
      .sort((a, b) => (b.analysis?.marketEvidence.marketValidationScore ?? 0) - (a.analysis?.marketEvidence.marketValidationScore ?? 0)),
    [papers]
  )

  return (
    <AppLayout title="Top Market Validation">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Top Market Validation</h1>
            <p className="text-muted-foreground">Papers ranked by market validation score (real trial &amp; approval data)</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No analyzed papers with market validation data.</p>
              <Link href="/upload">
                <Button variant="link">Upload a paper</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sorted.map((paper, idx) => (
              <Link key={paper.id} href={`/analysis/${paper.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold font-mono text-muted-foreground/40 w-8 text-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium leading-snug line-clamp-1">{paper.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {paper.authors.slice(0, 2).join(', ')}
                          {paper.authors.length > 2 && ` +${paper.authors.length - 2}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xl font-bold font-mono text-chart-3">
                            {paper.analysis?.marketEvidence.marketValidationScore}<span className="text-sm text-muted-foreground">/100</span>
                          </p>
                          <p className="text-xs text-muted-foreground">Market</p>
                        </div>
                        {paper.analysis && (
                          <div className="flex flex-col gap-1">
                            <Badge className={getTrlColor(paper.analysis.trlScore)}>
                              TRL {paper.analysis.trlScore}
                            </Badge>
                            <Badge variant="outline" className={getRiskColor(paper.analysis.riskLevel)}>
                              {paper.analysis.riskLevel}
                            </Badge>
                            {paper.analysis.domain && (
                              <Badge variant="secondary" className="text-xs">
                                {paper.analysis.domain.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        )}
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
