'use client'

import { motion } from 'framer-motion'
import { Activity, FlaskConical, BadgeCheck, Quote, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { MarketEvidence } from '@/lib/types'

interface MarketEvidenceCardProps {
  marketEvidence: MarketEvidence
}

// Maturity → label + accent color
const MATURITY: Record<MarketEvidence['fieldMaturity'], { label: string; dot: string; text: string }> = {
  nascent:     { label: 'Nascent',     dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
  emerging:    { label: 'Emerging',    dot: 'bg-chart-4',          text: 'text-chart-4' },
  growing:     { label: 'Growing',     dot: 'bg-chart-3',          text: 'text-chart-3' },
  established: { label: 'Established', dot: 'bg-trl-high',          text: 'text-trl-high' },
  mature:      { label: 'Mature',      dot: 'bg-green-500',         text: 'text-green-500' },
}

export function MarketEvidenceCard({ marketEvidence }: MarketEvidenceCardProps) {
  const {
    marketValidationScore: score,
    fieldMaturity,
    activeTrialsInSpace,
    completedTrialsInSpace,
    approvedDrugsInClass,
    evidenceBasis,
    citationSignal,
  } = marketEvidence

  const maturity = MATURITY[fieldMaturity] ?? MATURITY.nascent

  // Real, verifiable evidence rows — only shown when data exists.
  const rows = [
    approvedDrugsInClass > 0 && {
      icon: BadgeCheck,
      text: `${approvedDrugsInClass} FDA-approved drug${approvedDrugsInClass !== 1 ? 's' : ''} in class`,
    },
    activeTrialsInSpace > 0 && {
      icon: Activity,
      text: `${activeTrialsInSpace} active clinical trial${activeTrialsInSpace !== 1 ? 's' : ''}`,
    },
    completedTrialsInSpace > 0 && {
      icon: FlaskConical,
      text: `${completedTrialsInSpace} completed trial${completedTrialsInSpace !== 1 ? 's' : ''}`,
    },
    citationSignal && citationSignal !== 'no citation data available' && {
      icon: Quote,
      text: citationSignal,
    },
  ].filter(Boolean) as { icon: typeof Activity; text: string }[]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Market Validation</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  A 0–100 signal derived from <strong>real data</strong>: FDA approvals,
                  clinical trial phases (ClinicalTrials.gov) and citation activity
                  (Semantic Scholar). Not a dollar projection.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score + maturity */}
        <div className="flex items-baseline gap-3">
          <motion.span
            className="text-5xl font-bold font-mono text-chart-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {score}
            <span className="text-2xl text-muted-foreground"> / 100</span>
          </motion.span>
          <div className={cn('flex items-center text-sm', maturity.text)}>
            <span className={cn('h-2 w-2 rounded-full mr-1.5', maturity.dot)} />
            <span>{maturity.label} field</span>
          </div>
        </div>

        {/* Score bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-chart-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
        </div>

        {/* Evidence */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Evidence basis</p>
          {rows.length > 0 ? (
            rows.map((row, i) => {
              const Icon = row.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-center gap-2 text-sm"
                >
                  <Icon className="h-4 w-4 text-chart-3 shrink-0" />
                  <span>{row.text}</span>
                </motion.div>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              {evidenceBasis || 'No approvals or trials found — pre-clinical / emerging space.'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
