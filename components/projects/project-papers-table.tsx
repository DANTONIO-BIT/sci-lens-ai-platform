'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, ExternalLink, Trash2 } from 'lucide-react'
import { ProjectPaper } from '@/lib/types'

interface ProjectPapersTableProps {
  papers: ProjectPaper[]
  onRemove?: (paperId: string) => void
}

type SortKey = 'title' | 'trl' | 'tam' | 'risk' | 'evidence'

const RISK_BADGE: Record<string, string> = {
  low: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  high: 'bg-red-500/10 text-red-600 border-red-500/20',
}

const EVIDENCE_RANK: Record<string, number> = {
  meta_analysis: 9, rct: 8, cohort: 7, case_control: 6,
  in_vivo: 5, in_vitro: 4, in_silico: 3, review: 2, other: 1,
}

export function ProjectPapersTable({ papers, onRemove }: ProjectPapersTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('trl')
  const [asc, setAsc] = useState(false)

  const toggle = (key: SortKey) => {
    if (sortKey === key) setAsc((v) => !v)
    else { setSortKey(key); setAsc(false) }
  }

  const sorted = [...papers].sort((a, b) => {
    let diff = 0
    if (sortKey === 'title') {
      diff = a.title.localeCompare(b.title)
    } else if (sortKey === 'trl') {
      diff = (a.analysis?.trlLevel ?? 0) - (b.analysis?.trlLevel ?? 0)
    } else if (sortKey === 'tam') {
      diff = parseFloat(a.analysis?.tamEstimate ?? '0') - parseFloat(b.analysis?.tamEstimate ?? '0')
    } else if (sortKey === 'risk') {
      const order = { low: 1, medium: 2, high: 3 }
      diff = (order[a.analysis?.regulatoryComplexity as keyof typeof order] ?? 0) -
             (order[b.analysis?.regulatoryComplexity as keyof typeof order] ?? 0)
    } else if (sortKey === 'evidence') {
      diff = (EVIDENCE_RANK[a.analysis?.evidenceQuality?.level ?? 'other'] ?? 0) -
             (EVIDENCE_RANK[b.analysis?.evidenceQuality?.level ?? 'other'] ?? 0)
    }
    return asc ? diff : -diff
  })

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => toggle(k)}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Papers in Project ({papers.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left"><SortBtn k="title" label="Title" /></th>
                <th className="px-4 py-3 text-center"><SortBtn k="trl" label="TRL" /></th>
                <th className="px-4 py-3 text-center"><SortBtn k="tam" label="TAM ($B)" /></th>
                <th className="px-4 py-3 text-center"><SortBtn k="evidence" label="Evidence" /></th>
                <th className="px-4 py-3 text-center"><SortBtn k="risk" label="Risk" /></th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">Regulatory Pathway</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((paper) => {
                const a = paper.analysis
                const trl = a?.trlLevel
                const trlColor = trl != null
                  ? trl >= 7 ? 'text-green-500' : trl >= 4 ? 'text-yellow-500' : 'text-red-500'
                  : 'text-muted-foreground'

                return (
                  <tr key={paper.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 max-w-xs">
                      <Link href={`/analysis/${paper.id}`} className="font-medium hover:text-primary line-clamp-2">
                        {paper.title}
                      </Link>
                      {paper.year && (
                        <span className="text-xs text-muted-foreground ml-0"> · {paper.year}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {trl != null ? (
                        <span className={`font-bold text-base ${trlColor}`}>{trl}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {a?.tamEstimate ? `$${parseFloat(a.tamEstimate).toFixed(1)}B` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a?.evidenceQuality?.level ? (
                        <Badge variant="outline" className="text-xs capitalize">
                          {a.evidenceQuality.level.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a?.regulatoryComplexity ? (
                        <Badge variant="outline" className={`text-xs ${RISK_BADGE[a.regulatoryComplexity] ?? ''}`}>
                          {a.regulatoryComplexity}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {a?.regulatoryPathway || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/analysis/${paper.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        {onRemove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => onRemove(paper.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {papers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No papers in this project yet. Add papers using the button above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
