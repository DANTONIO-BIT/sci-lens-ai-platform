'use client'

import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Analysis } from '@/lib/types'

interface TamCardProps {
  tamEstimate: Analysis['tamEstimate']
}

export function TamCard({ tamEstimate }: TamCardProps) {
  const { value, breakdown } = tamEstimate
  const maxSegmentValue = Math.max(...breakdown.map(b => b.value))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Total Addressable Market</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>TAM represents the total revenue opportunity available if 100% market share was achieved.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main value */}
        <div className="flex items-baseline gap-2">
          <motion.span 
            className="text-5xl font-bold font-mono text-chart-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            ${value.toFixed(1)}B
          </motion.span>
          <div className="flex items-center text-sm text-trl-high">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span>Growing market</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Market Segments</p>
          {breakdown.map((segment, index) => (
            <motion.div
              key={segment.segment}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-sm">
                <span>{segment.segment}</span>
                <span className="font-mono font-medium">${segment.value.toFixed(1)}B</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-chart-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(segment.value / maxSegmentValue) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{segment.percentage}% of total TAM</p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
