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
import { listPapers, getPaperStats } from '@/lib/api'
import { adaptApiPaper } from '@/lib/adapters'
import { supabase } from '@/lib/supabase'
import { DemoBanner } from '@/components/demo-banner'
import type { Paper, DashboardStats } from '@/lib/types'

function PaperSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 -mx-4">
      <div className="w-12 h-12 rounded-lg bg-muted/50 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-muted/50 animate-pulse rounded" />
        <div className="h-3 w-1/2 bg-muted/50 animate-pulse rounded" />
        <div className="h-3 w-1/3 bg-muted/50 animate-pulse rounded" />
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [papers, setPapers] = React.useState<Paper[]>([])
  const [stats, setStats] = React.useState<DashboardStats>({
    totalPapers: 0,
    analyzedPapers: 0,
    avgTrlScore: 0,
    totalTamValue: 0,
    highRiskCount: 0,
    recentActivity: [],
  })
  const [loading, setLoading] = React.useState(true)
  const [isGuest, setIsGuest] = React.useState(false)

  React.useEffect(() => {
    const load = async () => {
      // No session → show demo data immediately, no API calls
      const { data: { session } } = await supabase().auth.getSession()
      if (!session) {
        const { mockPapers, processingPapers, mockDashboardStats } = await import('@/lib/mock-data')
        setPapers([...mockPapers, ...processingPapers])
        setStats(mockDashboardStats)
        setIsGuest(true)
        setLoading(false)
        return
      }

      try {
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
        // Backend unavailable
      }

      try {
        const resp = await listPapers()
        if (resp.papers && resp.papers.length > 0) {
          const realPapers = resp.papers.map(adaptApiPaper)
          setPapers(realPapers)
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
        // API error for authenticated user — show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="space-y-6">
          <StatsSkeleton />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="col-span-2 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <PaperSkeleton key={i} />)}
            </div>
            <div className="space-y-6">
              <div className="h-28 rounded-xl bg-muted/50 animate-pulse" />
              <div className="h-56 rounded-xl bg-muted/50 animate-pulse" />
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (papers.length === 0) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium">No papers yet</p>
          <p className="text-muted-foreground mt-1">Upload your first paper to get started</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {isGuest && <DemoBanner />}
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
