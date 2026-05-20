'use client'

import * as React from 'react'
import { AppLayout } from '@/components/layout'
import { ResearchGraph, ClusterLegend } from '@/components/graph'
import { Card, CardContent } from '@/components/ui/card'
import { mockGraphNodes, mockGraphLinks, mockClusters } from '@/lib/mock-data'
import { getGraph } from '@/lib/api'
import type { GraphNode, GraphLink, GraphCluster } from '@/lib/types'

export default function GraphPage() {
  const [nodes, setNodes] = React.useState<GraphNode[]>(mockGraphNodes)
  const [links, setLinks] = React.useState<GraphLink[]>(mockGraphLinks)
  const [clusters, setClusters] = React.useState<GraphCluster[]>(mockClusters)
  const [selectedCluster, setSelectedCluster] = React.useState<string | undefined>()

  React.useEffect(() => {
    const load = async () => {
      try {
        const data = await getGraph()
        if (data.nodes && data.nodes.length > 0) {
          setNodes(data.nodes as GraphNode[])
          setLinks(data.links as GraphLink[])
          // Derive clusters from unique cluster names in nodes
          const clusterMap = new Map<string, { color: string; count: number }>()
          data.nodes.forEach(n => {
            const existing = clusterMap.get(n.cluster)
            if (existing) {
              existing.count++
            } else {
              clusterMap.set(n.cluster, { color: n.clusterColor, count: 1 })
            }
          })
          setClusters(
            Array.from(clusterMap.entries()).map(([name, v]) => ({
              id: name,
              name,
              color: v.color,
              nodeCount: v.count,
            }))
          )
        }
      } catch {
        // Demo mode — keep mock data
      }
    }
    load()
  }, [])

  const filteredNodes = React.useMemo(() => {
    if (!selectedCluster) return nodes
    return nodes.filter(n => n.cluster === selectedCluster)
  }, [nodes, selectedCluster])

  const filteredLinks = React.useMemo(() => {
    if (!selectedCluster) return links
    const nodeIds = new Set(filteredNodes.map(n => n.id))
    return links.filter(
      l => nodeIds.has(l.source as string) && nodeIds.has(l.target as string)
    )
  }, [links, selectedCluster, filteredNodes])

  return (
    <AppLayout title="Research Graph">
      <div className="space-y-6 h-[calc(100vh-10rem)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Research Network</h1>
            <p className="text-muted-foreground">
              Explore connections between papers based on semantic similarity
            </p>
          </div>
          <ClusterLegend
            clusters={clusters}
            selectedCluster={selectedCluster}
            onClusterSelect={setSelectedCluster}
          />
        </div>

        <Card className="flex-1 min-h-0">
          <CardContent className="p-0 h-[calc(100vh-16rem)]">
            <ResearchGraph nodes={filteredNodes} links={filteredLinks} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Papers in view', value: filteredNodes.length },
            { label: 'Connections', value: filteredLinks.length },
            { label: 'Research clusters', value: clusters.length },
            { label: 'Semantic links', value: filteredLinks.filter(l => l.type === 'semantic').length },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold font-mono">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
