'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RiskFactor } from '@/lib/types'

interface RiskPanelProps {
  riskLevel: 'low' | 'medium' | 'high'
  riskScore: number
  riskFactors: RiskFactor[]
}

function getRiskConfig(level: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'low':
      return { 
        icon: ShieldCheck, 
        color: 'text-trl-high', 
        bgColor: 'bg-trl-high/10',
        borderColor: 'border-trl-high/30',
        label: 'Low Risk'
      }
    case 'medium':
      return { 
        icon: Shield, 
        color: 'text-trl-mid', 
        bgColor: 'bg-trl-mid/10',
        borderColor: 'border-trl-mid/30',
        label: 'Medium Risk'
      }
    case 'high':
      return { 
        icon: ShieldAlert, 
        color: 'text-trl-low', 
        bgColor: 'bg-trl-low/10',
        borderColor: 'border-trl-low/30',
        label: 'High Risk'
      }
  }
}

function getCategoryIcon(category: RiskFactor['category']) {
  return AlertTriangle
}

function getSeverityColor(severity: RiskFactor['severity']) {
  switch (severity) {
    case 'low': return 'bg-trl-high/15 text-trl-high border-trl-high/30'
    case 'medium': return 'bg-trl-mid/15 text-trl-mid border-trl-mid/30'
    case 'high': return 'bg-trl-low/15 text-trl-low border-trl-low/30'
  }
}

export function RiskPanel({ riskLevel, riskScore, riskFactors }: RiskPanelProps) {
  const config = getRiskConfig(riskLevel)
  const Icon = config.icon

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Risk Assessment</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Risk factors are analyzed across technical, market, regulatory, and competitive dimensions.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk indicator */}
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className={cn('p-4 rounded-xl', config.bgColor)}
          >
            <Icon className={cn('h-8 w-8', config.color)} />
          </motion.div>
          <div>
            <p className={cn('text-2xl font-bold', config.color)}>{config.label}</p>
            <p className="text-sm text-muted-foreground">
              Risk Score: <span className="font-mono">{riskScore}/100</span>
            </p>
          </div>
        </div>

        {/* Risk meter */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Lower Risk</span>
            <span>Higher Risk</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden flex">
            <div className="w-1/3 bg-trl-high" />
            <div className="w-1/3 bg-trl-mid" />
            <div className="w-1/3 bg-trl-low" />
          </div>
          <motion.div
            className="relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className="absolute -top-5 w-3 h-3 bg-foreground rounded-full border-2 border-background shadow-lg"
              initial={{ left: '0%' }}
              animate={{ left: `${riskScore}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ transform: 'translateX(-50%)' }}
            />
          </motion.div>
        </div>

        {/* Risk factors */}
        <div className="space-y-3 pt-2">
          <p className="text-sm font-medium text-muted-foreground">Key Risk Factors</p>
          {riskFactors.map((factor, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
            >
              <AlertTriangle className={cn(
                'h-4 w-4 mt-0.5 shrink-0',
                factor.severity === 'high' ? 'text-trl-low' :
                factor.severity === 'medium' ? 'text-trl-mid' : 'text-trl-high'
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {factor.category}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={cn('text-[10px] uppercase', getSeverityColor(factor.severity))}
                  >
                    {factor.severity}
                  </Badge>
                </div>
                <p className="text-sm">{factor.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
