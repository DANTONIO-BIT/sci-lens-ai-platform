'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Paper } from '@/lib/types'

interface TrlDistributionChartProps {
  papers: Paper[]
}

export function TrlDistributionChart({ papers }: TrlDistributionChartProps) {
  const analyzedPapers = papers.filter(p => p.analysis)
  
  const distribution = [
    { name: 'TRL 1-3 (Early)', value: 0, color: 'var(--trl-low)' },
    { name: 'TRL 4-6 (Mid)', value: 0, color: 'var(--trl-mid)' },
    { name: 'TRL 7-9 (Late)', value: 0, color: 'var(--trl-high)' },
  ]

  analyzedPapers.forEach(paper => {
    const trl = paper.analysis?.trlScore || 0
    if (trl <= 3) distribution[0].value++
    else if (trl <= 6) distribution[1].value++
    else distribution[2].value++
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>TRL Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
