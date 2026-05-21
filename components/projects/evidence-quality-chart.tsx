'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const EVIDENCE_LABELS: Record<string, string> = {
  meta_analysis: 'Meta-analysis',
  rct: 'RCT',
  cohort: 'Cohort',
  case_control: 'Case-control',
  in_vivo: 'In vivo',
  in_vitro: 'In vitro',
  in_silico: 'In silico',
  review: 'Review',
  other: 'Other',
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa',
  '#22c55e', '#86efac', '#fbbf24',
  '#f87171', '#94a3b8', '#64748b',
]

interface EvidenceQualityChartProps {
  distribution: Record<string, number>
}

export function EvidenceQualityChart({ distribution }: EvidenceQualityChartProps) {
  const data = Object.entries(distribution)
    .filter(([, v]) => v > 0)
    .map(([key, value], i) => ({
      name: EVIDENCE_LABELS[key] ?? key,
      value,
      color: COLORS[i % COLORS.length],
    }))

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Evidence Quality</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          No analyzed papers yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Evidence Quality Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
