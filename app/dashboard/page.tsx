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
import { adaptApiPaper } from '@/lib/adapters'
import type { Paper, DashboardStats } from '@/lib/types'

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
