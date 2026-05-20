'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Paper } from '@/lib/types'

interface RecentPapersProps {
  papers: Paper[]
}

function getTrlColor(score: number): string {
  if (score >= 7) return 'bg-trl-high text-trl-high'
  if (score >= 4) return 'bg-trl-mid text-trl-mid'
  return 'bg-trl-low text-trl-low'
}

function getRiskColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'low': return 'bg-trl-high/15 text-trl-high border-trl-high/30'
    case 'medium': return 'bg-trl-mid/15 text-trl-mid border-trl-mid/30'
    case 'high': return 'bg-trl-low/15 text-trl-low border-trl-low/30'
  }
}

export function RecentPapers({ papers }: RecentPapersProps) {
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Papers</CardTitle>
        <Link href="/dashboard/papers">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {papers.slice(0, 5).map((paper) => (
          <Link 
            key={paper.id} 
            href={`/analysis/${paper.id}`}
            className="block"
          >
            <div className="group flex items-start gap-4 p-4 -mx-4 rounded-lg hover:bg-muted/50 transition-colors">
              {/* TRL Score Indicator */}
              {paper.analysis && (
                <div className="flex flex-col items-center shrink-0">
                  <div className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center font-mono font-bold text-xl',
                    getTrlColor(paper.analysis.trlScore).replace('text-', 'bg-').replace('bg-bg', 'bg') + '/15'
                  )}>
                    <span className={getTrlColor(paper.analysis.trlScore).split(' ')[1]}>
                      {paper.analysis.trlScore}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">TRL</span>
                </div>
              )}

              {/* Paper Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {paper.title}
                  </h3>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {paper.authors.slice(0, 2).join(', ')}
                  {paper.authors.length > 2 && ` +${paper.authors.length - 2}`}
                </p>
                
                {paper.analysis && (
                  <div className="flex items-center gap-3 mt-2">
                    <Badge 
                      variant="outline" 
                      className={cn('text-[10px] uppercase', getRiskColor(paper.analysis.riskLevel))}
                    >
                      {paper.analysis.riskLevel} risk
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      ${paper.analysis.tamEstimate.value.toFixed(1)}B TAM
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(paper.uploadedAt, { addSuffix: true })}
                    </span>
                  </div>
                )}

                {paper.status === 'processing' && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Analyzing...</span>
                      <span className="text-xs text-muted-foreground">65%</span>
                    </div>
                    <Progress value={65} className="h-1" />
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
