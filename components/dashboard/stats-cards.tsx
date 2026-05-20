'use client'

import { 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  DollarSign, 
  AlertTriangle,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardStats } from '@/lib/types'

interface StatsCardsProps {
  stats: DashboardStats
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
      title: 'Total TAM',
      value: `$${stats.totalTamValue.toFixed(0)}B`,
      subtitle: 'Market opportunity',
      icon: DollarSign,
      trend: '+$42B',
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
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
  )
}
