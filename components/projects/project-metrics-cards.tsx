'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectMetrics } from '@/lib/types'
import { FlaskConical, TrendingUp, DollarSign, ShieldAlert } from 'lucide-react'

interface ProjectMetricsCardsProps {
  metrics: ProjectMetrics
}

export function ProjectMetricsCards({ metrics }: ProjectMetricsCardsProps) {
  const trlColor =
    metrics.avgTrl >= 7 ? 'text-green-500' :
    metrics.avgTrl >= 4 ? 'text-yellow-500' : 'text-red-500'

  const highRisk = metrics.riskDistribution['high'] ?? 0
  const totalRisk = Object.values(metrics.riskDistribution).reduce((a, b) => a + b, 0)
  const riskPct = totalRisk > 0 ? Math.round((highRisk / totalRisk) * 100) : 0

  const cards = [
    {
      title: 'Papers Analyzed',
      value: `${metrics.analyzedCount} / ${metrics.paperCount}`,
      sub: `${metrics.paperCount - metrics.analyzedCount} pending`,
      icon: FlaskConical,
      iconColor: 'text-primary',
    },
    {
      title: 'Avg TRL Score',
      value: metrics.avgTrl.toFixed(1),
      sub: metrics.avgTrl >= 7 ? 'Operational stage' : metrics.avgTrl >= 4 ? 'Validation stage' : 'Research stage',
      icon: TrendingUp,
      iconColor: trlColor,
      valueColor: trlColor,
    },
    {
      title: 'Total TAM',
      value: `$${metrics.totalTamBillions.toFixed(1)}B`,
      sub: 'Addressable market (USD)',
      icon: DollarSign,
      iconColor: 'text-emerald-500',
    },
    {
      title: 'High-Risk Papers',
      value: `${highRisk}`,
      sub: `${riskPct}% of analyzed portfolio`,
      icon: ShieldAlert,
      iconColor: highRisk > 0 ? 'text-red-500' : 'text-green-500',
      valueColor: highRisk > 0 ? 'text-red-500' : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
            <c.icon className={`h-4 w-4 ${c.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${c.valueColor ?? ''}`}>{c.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
