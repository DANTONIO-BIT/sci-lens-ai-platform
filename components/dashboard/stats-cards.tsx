'use client'

import {
  TrendingUp,
  TrendingDown,
  FileText,
  Gauge,
  AlertTriangle,
  Activity,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DashboardStats } from '@/lib/types'

interface StatsCardsProps {
  stats: DashboardStats
}

const TOOLTIPS: Record<string, string> = {
  'Total Papers': 'Total papers uploaded. Analyzed papers have completed AI scoring for TRL, market validation and risk. Processing papers are queued for analysis.',
  'Avg. TRL Score': 'Average Technology Readiness Level across analyzed papers (scale 1–9). TRL 1–3: basic research. TRL 4–6: lab/pilot validation. TRL 7–9: operational/commercial stage. FDA and EMA commonly require TRL 6+ before regulatory submission.',
  'Market Validation': 'Average market validation score (0–100) across analyzed papers. Derived from real data: FDA approvals, clinical trial phases (ClinicalTrials.gov) and citation activity (Semantic Scholar). Not a dollar projection.',
  'High Risk': 'Papers flagged as high regulatory, technical or market risk by the AI. High risk does not mean low value — it signals areas requiring deeper due diligence before investment or development commitment.',
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Papers',
      value: stats.totalPapers,
      subtitle: `${stats.analyzedPapers} analyzed`,
      icon: FileText,
      trend: '+12%',
      trendUp: true,
      color: 'text-chart-1',
      bgColor: 'bg-chart-1/10',
    },
    {
      title: 'Avg. TRL Score',
      value: stats.avgTrlScore.toFixed(1),
      subtitle: 'Technology Readiness',
      icon: Activity,
      trend: '+0.3',
      trendUp: true,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
    },
    {
      title: 'Market Validation',
      value: `${stats.avgMarketScore.toFixed(0)}/100`,
      subtitle: 'Avg. validation score',
      icon: Gauge,
      trend: '+4',
      trendUp: true,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
    },
    {
      title: 'High Risk',
      value: stats.highRiskCount,
      subtitle: 'Papers flagged',
      icon: AlertTriangle,
      trend: '-2',
      trendUp: false,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ]

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    {TOOLTIPS[card.title]}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className={cn('p-2 rounded-lg', card.bgColor)}>
                <card.icon className={cn('h-4 w-4', card.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight font-mono">
                {card.value}
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                <div className={cn(
                  'flex items-center text-xs font-medium',
                  card.trendUp ? 'text-chart-2' : 'text-chart-2'
                )}>
                  {card.trendUp ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {card.trend}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  )
}
