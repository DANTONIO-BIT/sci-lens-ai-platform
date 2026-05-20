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
import { listPapers } from '@/lib/api'
import type { Paper, DashboardStats } from '@/lib/types'

const adaptApiPaper = (p: {
  id: string
  title: string
  authors: string[]
  status: string
  created_at: string
  file_name: string
}): Paper => ({
  id: p.id,
  title: p.title,
  authors: p.authors ?? [],
  abstract: '',
  uploadedAt: new Date(p.created_at),
  status: (p.status as Paper['status']) ?? 'processing',
})

export default function DashboardPage() {
  const [papers, setPapers] = React.useState<Paper[]>([...mockPapers, ...processingPapers])
  const [stats, setStats] = React.useState<DashboardStats>(mockDashboardStats)

  React.useEffect(() => {
    const load = async () => {
      try {
        const resp = await listPapers()
        if (resp.papers && resp.papers.length > 0) {
          const realPapers = resp.papers.map(adaptApiPaper)
          const analyzed = realPapers.filter(p => p.status === 'analyzed').length
          setPapers(realPapers)
          setStats({
            totalPapers: realPapers.length,
            analyzedPapers: analyzed,
            avgTrlScore: mockDashboardStats.avgTrlScore,
            totalTamValue: mockDashboardStats.totalTamValue,
            highRiskCount: mockDashboardStats.highRiskCount,
            recentActivity: realPapers.slice(0, 5).map((p, i) => ({
              id: `act-${i}`,
              type: (p.status === 'analyzed' ? 'analysis' : 'upload') as 'analysis' | 'upload',
              paperId: p.id,
              paperTitle: p.title,
              timestamp: p.uploadedAt,
              description: p.status === 'analyzed' ? 'Analysis completed' : 'Paper uploaded',
            })),
          })
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
