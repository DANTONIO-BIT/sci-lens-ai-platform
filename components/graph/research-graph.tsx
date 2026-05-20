'use client'

import * as React from 'react'
import * as d3 from 'd3'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { GraphNode, GraphLink } from '@/lib/types'

interface ResearchGraphProps {
  nodes: GraphNode[]
  links: GraphLink[]
  onNodeClick?: (node: GraphNode) => void
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  cluster: string
  clusterColor: string
  relevance: number
  connections: string[]
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  strength: number
  type: 'citation' | 'semantic' | 'author'
}

export function ResearchGraph({ nodes, links, onNodeClick }: ResearchGraphProps) {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [selectedNode, setSelectedNode] = React.useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null)
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 })
  const router = useRouter()

  // Update dimensions on resize
  React.useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height: Math.max(height, 500) })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // D3 Force Simulation
  React.useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { width, height } = dimensions

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Create main group for zoom/pan
    const g = svg.append('g')

    // Prepare data for simulation
    const simNodes: SimNode[] = nodes.map(n => ({ ...n }))
    const simLinks: SimLink[] = links.map(l => ({
      source: l.source,
      target: l.target,
      strength: l.strength,
      type: l.type,
    }))

    // Create force simulation
    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(100)
        .strength(d => d.strength * 0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => getNodeRadius(d.relevance) + 10))

    // Draw links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => d.strength * 2)
      .attr('stroke-dasharray', d => d.type === 'semantic' ? '4,4' : 'none')

    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded))

    // Node circles
    node.append('circle')
      .attr('r', d => getNodeRadius(d.relevance))
      .attr('fill', d => d.clusterColor)
      .attr('fill-opacity', 0.8)
      .attr('stroke', d => d.clusterColor)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 1)

    // Node labels
    node.append('text')
      .text(d => truncateLabel(d.label, 20))
      .attr('font-size', '10px')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeRadius(d.relevance) + 14)
      .attr('opacity', 0.8)

    // Event handlers
    node.on('mouseover', function(event, d) {
      setHoveredNode(d.id)
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', getNodeRadius(d.relevance) * 1.2)
        .attr('fill-opacity', 1)

      // Highlight connected links
      link.attr('stroke-opacity', l => 
        (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id ? 1 : 0.2
      )
    })

    node.on('mouseout', function(event, d) {
      setHoveredNode(null)
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', getNodeRadius(d.relevance))
        .attr('fill-opacity', 0.8)

      link.attr('stroke-opacity', 0.6)
    })

    node.on('click', (event, d) => {
      event.stopPropagation()
      const originalNode = nodes.find(n => n.id === d.id)
      if (originalNode) {
        setSelectedNode(originalNode)
        onNodeClick?.(originalNode)
      }
    })

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x!)
        .attr('y1', d => (d.source as SimNode).y!)
        .attr('x2', d => (d.target as SimNode).x!)
        .attr('y2', d => (d.target as SimNode).y!)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Drag functions
    function dragStarted(event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragEnded(event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [nodes, links, dimensions, onNodeClick])

  const handleViewAnalysis = () => {
    if (selectedNode?.id.startsWith('paper-')) {
      router.push(`/analysis/${selectedNode.id}`)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[500px]">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-background"
      />

      {/* Selected node tooltip */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 rounded-lg border bg-card shadow-lg"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium line-clamp-2">{selectedNode.label}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge 
                    style={{ backgroundColor: selectedNode.clusterColor + '30', color: selectedNode.clusterColor }}
                    className="border-0"
                  >
                    {selectedNode.cluster}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Relevance: {selectedNode.relevance}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedNode.connections.length} connections
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={() => setSelectedNode(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {selectedNode.id.startsWith('paper-') && (
              <Button 
                className="w-full mt-3" 
                size="sm"
                onClick={handleViewAnalysis}
              >
                View Analysis
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      {!selectedNode && (
        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
          Drag to pan, scroll to zoom, click nodes for details
        </div>
      )}
    </div>
  )
}

function getNodeRadius(relevance: number): number {
  return 10 + (relevance / 100) * 20
}

function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label
  return label.slice(0, maxLength - 3) + '...'
}
