'use client'

import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TrlGaugeProps {
  score: number
  confidence: number
  description: string
}

const trlDescriptions: Record<number, string> = {
  1: 'Basic principles observed',
  2: 'Technology concept formulated',
  3: 'Experimental proof of concept',
  4: 'Technology validated in lab',
  5: 'Technology validated in relevant environment',
  6: 'Technology demonstrated in relevant environment',
  7: 'System prototype demonstration',
  8: 'System complete and qualified',
  9: 'Actual system proven in operational environment',
}

function getTrlColor(score: number): string {
  if (score >= 7) return 'text-trl-high'
  if (score >= 4) return 'text-trl-mid'
  return 'text-trl-low'
}

function getTrlBgColor(score: number): string {
  if (score >= 7) return 'bg-trl-high'
  if (score >= 4) return 'bg-trl-mid'
  return 'bg-trl-low'
}

export function TrlGauge({ score, confidence, description }: TrlGaugeProps) {
  const percentage = (score / 9) * 100

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Technology Readiness Level</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>TRL measures technology maturity from 1 (basic research) to 9 (proven in operation).</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          {/* Circular gauge */}
          <div className="relative">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              {/* Progress circle */}
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className={getTrlColor(score)}
                strokeDasharray={`${2 * Math.PI * 40}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ 
                  strokeDashoffset: 2 * Math.PI * 40 * (1 - percentage / 100)
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                className={cn('text-4xl font-bold font-mono', getTrlColor(score))}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                {score}
              </motion.span>
              <span className="text-xs text-muted-foreground">of 9</span>
            </div>
          </div>

          {/* Info section */}
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium">{trlDescriptions[score]}</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            
            {/* Confidence bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium">{confidence}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', getTrlBgColor(score))}
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
            </div>

            {/* TRL scale */}
            <div className="flex gap-1">
              {Array.from({ length: 9 }, (_, i) => i + 1).map((level) => (
                <div
                  key={level}
                  className={cn(
                    'flex-1 h-1.5 rounded-full transition-colors',
                    level <= score ? getTrlBgColor(score) : 'bg-muted'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
