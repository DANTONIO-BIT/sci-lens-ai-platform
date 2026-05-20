'use client'

import { formatDistanceToNow } from 'date-fns'
import { 
  FileText, 
  BarChart3, 
  Eye, 
  Download,
  Upload,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActivityItem } from '@/lib/types'

interface ActivityFeedProps {
  activities: ActivityItem[]
}

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'upload':
      return { icon: Upload, color: 'text-chart-1', bgColor: 'bg-chart-1/10' }
    case 'analysis':
      return { icon: BarChart3, color: 'text-chart-2', bgColor: 'bg-chart-2/10' }
    case 'view':
      return { icon: Eye, color: 'text-chart-3', bgColor: 'bg-chart-3/10' }
    case 'export':
      return { icon: Download, color: 'text-chart-4', bgColor: 'bg-chart-4/10' }
  }
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const { icon: Icon, color, bgColor } = getActivityIcon(activity.type)
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg shrink-0', bgColor)}>
                  <Icon className={cn('h-4 w-4', color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.description}</p>
                  {activity.paperTitle && (
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.paperTitle}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
