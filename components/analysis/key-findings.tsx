'use client'

import { motion } from 'framer-motion'
import { Lightbulb, Rocket, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { KeyFinding } from '@/lib/types'

interface KeyFindingsProps {
  findings: KeyFinding[]
}

function getCategoryConfig(category: KeyFinding['category']) {
  switch (category) {
    case 'innovation':
      return { icon: Lightbulb, color: 'text-chart-1', bgColor: 'bg-chart-1/10' }
    case 'application':
      return { icon: Rocket, color: 'text-chart-2', bgColor: 'bg-chart-2/10' }
    case 'limitation':
      return { icon: AlertCircle, color: 'text-chart-3', bgColor: 'bg-chart-3/10' }
    case 'opportunity':
      return { icon: Sparkles, color: 'text-chart-4', bgColor: 'bg-chart-4/10' }
  }
}

export function KeyFindings({ findings }: KeyFindingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Key Findings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {findings.map((finding, index) => {
            const config = getCategoryConfig(finding.category)
            const Icon = config.icon
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4 p-4 rounded-lg border bg-card"
              >
                <div className={cn('p-2 rounded-lg h-fit', config.bgColor)}>
                  <Icon className={cn('h-5 w-5', config.color)} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium">{finding.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {finding.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {finding.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Confidence</span>
                    <Progress value={finding.confidence} className="flex-1 h-1.5" />
                    <span className="text-xs font-medium font-mono">{finding.confidence}%</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
