'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { listPapers, addPaperToProject } from '@/lib/api'
import { Loader2, Plus } from 'lucide-react'

interface AddPaperDialogProps {
  projectId: string
  existingPaperIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: () => void
}

export function AddPaperDialog({
  projectId, existingPaperIds, open, onOpenChange, onAdded,
}: AddPaperDialogProps) {
  const [papers, setPapers] = useState<Array<{ id: string; title: string; status: string }>>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listPapers()
      .then((res) => {
        const available = res.papers.filter(
          (p) => !existingPaperIds.includes(p.id) && p.status === 'analyzed'
        )
        setPapers(available)
      })
      .catch(() => setPapers([]))
      .finally(() => setLoading(false))
  }, [open, existingPaperIds])

  const handleAdd = async (paperId: string) => {
    setAdding(paperId)
    try {
      await addPaperToProject(projectId, paperId)
      onAdded()
      onOpenChange(false)
    } catch {
      // noop
    } finally {
      setAdding(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Paper to Project</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-2 py-2">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && papers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No analyzed papers available to add.
            </p>
          )}
          {papers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
            >
              <span className="text-sm line-clamp-2 flex-1 mr-3">{p.title}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAdd(p.id)}
                disabled={adding === p.id}
                className="shrink-0"
              >
                {adding === p.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <><Plus className="h-3.5 w-3.5 mr-1" />Add</>
                )}
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
