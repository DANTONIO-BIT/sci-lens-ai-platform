'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Analysis } from '@/lib/types'

interface AnalysisRadarChartProps {
  analysis: Analysis
}

export function AnalysisRadarChart({ analysis }: AnalysisRadarChartProps) {
  const data = [
    { category: 'TRL', value: (analysis.trlScore / 9) * 100, fullMark: 100 },
    { category: 'Impact', value: analysis.impactScore, fullMark: 100 },
    { category: 'Novelty', value: analysis.noveltyScore, fullMark: 100 },
    { category: 'Methodology', value: analysis.methodologyScore, fullMark: 100 },
    { category: 'Confidence', value: analysis.trlConfidence, fullMark: 100 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Analysis Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid 
                stroke="hsl(var(--border))" 
                strokeDasharray="3 3"
              />
              <PolarAngleAxis 
                dataKey="category" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <Radar
                name="Score"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-5 gap-2 mt-4">
          {data.map((item) => (
            <div key={item.category} className="text-center">
              <p className="text-lg font-bold font-mono">{Math.round(item.value)}</p>
              <p className="text-xs text-muted-foreground">{item.category}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
