'use client'

import { cn } from '@/lib/utils'
import type { GraphCluster } from '@/lib/types'

interface ClusterLegendProps {
  clusters: GraphCluster[]
  selectedCluster?: string
  onClusterSelect?: (clusterId: string | undefined) => void
}

export function ClusterLegend({ clusters, selectedCluster, onClusterSelect }: ClusterLegendProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onClusterSelect?.(undefined)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
          !selectedCluster 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        All ({clusters.reduce((sum, c) => sum + c.nodeCount, 0)})
      </button>
      {clusters.map((cluster) => (
        <button
          key={cluster.id}
          onClick={() => onClusterSelect?.(selectedCluster === cluster.id ? undefined : cluster.id)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            selectedCluster === cluster.id
              ? 'text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
          style={{
            backgroundColor: selectedCluster === cluster.id ? cluster.color : undefined,
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: cluster.color }}
          />
          {cluster.name} ({cluster.nodeCount})
        </button>
      ))}
    </div>
  )
}
