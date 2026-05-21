'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck } from 'lucide-react'

interface RegulatoryPanelProps {
  pathways: string[]
  riskDistribution: Record<string, number>
}

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  high: 'bg-red-500/10 text-red-600 border-red-500/20',
}

export function RegulatoryPanel({ pathways, riskDistribution }: RegulatoryPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm font-medium">Regulatory Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Identified Pathways</p>
          {pathways.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No regulatory pathways extracted yet</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {pathways.map((p) => (
                <Badge key={p} variant="outline" className="text-xs">
                  {p}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Risk Distribution</p>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <div
                key={level}
                className={`flex-1 rounded-md border px-2 py-1.5 text-center ${RISK_COLORS[level]}`}
              >
                <div className="text-lg font-bold">{riskDistribution[level] ?? 0}</div>
                <div className="text-xs capitalize">{level}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
