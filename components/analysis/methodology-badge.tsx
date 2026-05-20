'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MethodologyType } from '@/lib/types'

interface MethodologyBadgeProps {
  methodology: MethodologyType
  score: number
}

const methodologyConfig: Record<MethodologyType, { label: string; color: string }> = {
  'experimental': { label: 'Experimental', color: 'bg-chart-1/15 text-chart-1 border-chart-1/30' },
  'observational': { label: 'Observational', color: 'bg-chart-2/15 text-chart-2 border-chart-2/30' },
  'computational': { label: 'Computational', color: 'bg-chart-3/15 text-chart-3 border-chart-3/30' },
  'theoretical': { label: 'Theoretical', color: 'bg-chart-4/15 text-chart-4 border-chart-4/30' },
  'meta-analysis': { label: 'Meta-Analysis', color: 'bg-chart-5/15 text-chart-5 border-chart-5/30' },
  'review': { label: 'Review', color: 'bg-primary/15 text-primary border-primary/30' },
}

export function MethodologyBadge({ methodology, score }: MethodologyBadgeProps) {
  const config = methodologyConfig[methodology]
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={cn('uppercase text-xs', config.color)}>
        {config.label}
      </Badge>
      <span className="text-sm text-muted-foreground">
        Quality Score: <span className="font-mono font-medium">{score}/100</span>
      </span>
    </div>
  )
}
