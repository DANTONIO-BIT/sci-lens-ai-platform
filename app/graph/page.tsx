'use client'

import * as React from 'react'
import { AppLayout } from '@/components/layout'
import { ResearchGraph, ClusterLegend } from '@/components/graph'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FilePlus } from 'lucide-react'
import Link from 'next/link'
import { mockGraphNodes, mockGraphLinks, mockClusters } from '@/lib/mock-data'
import { getGraph } from '@/lib/api'
import type { GraphNode, GraphLink, GraphCluster } from '@/lib/types'

export default function GraphPage() {
  const [nodes, setNodes] = React.useState<GraphNode[]>(mockGraphNodes)
  const [links, setLinks] = React.useState<GraphLink[]>(mockGraphLinks)
  const [clusters, setClusters] = React.useState<GraphCluster[]>(mockClusters)
  const [selectedCluster, setSelectedCluster] = React.useState<string | undefined>()
  const [loading, setLoading] = React.useState(true)
  const [hasRealData, setHasRealData] = React.useState(false)

  React.useEffect(() => {
    const load = async () => {
      try {
        const data = await getGraph()
        if (data.nodes && data.nodes.length > 0) {
          setHasRealData(true)
          const adaptedNodes = data.nodes.map(n => ({
            ...n,
            connections: n.connections || [],
          }))
          setNodes(adaptedNodes)
          setLinks(data.links || [])
          // Derive clusters from unique cluster names in nodes
          const clusterMap = new Map<string, { color: string; count: number }>()
          data.nodes.forEach((n: GraphNode) => {
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
      } finally {
        setLoading(false)
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

  if (loading) {
    return (
      <AppLayout title="Research Graph">
        <div className="flex items-center justify-center h-96">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  if (!hasRealData && nodes.length === 0) {
    return (
      <AppLayout title="Research Graph">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FilePlus className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No papers to visualize</p>
          <p className="text-muted-foreground mt-1 mb-4">Upload at least 2 papers to see connections</p>
          <Link href="/upload">
            <Button>Upload papers</Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

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
