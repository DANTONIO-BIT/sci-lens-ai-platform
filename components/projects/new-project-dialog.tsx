'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { createProject } from '@/lib/api'
import { DomainType } from '@/lib/types'
import { Loader2 } from 'lucide-react'

const DOMAINS: { value: DomainType; label: string }[] = [
  { value: 'pharma_clinical', label: 'Pharma — Clinical' },
  { value: 'pharma_industrial', label: 'Pharma — Industrial / CMC' },
  { value: 'biotech', label: 'Biotechnology' },
  { value: 'medical_device', label: 'Medical Device' },
  { value: 'chemicals', label: 'Industrial Chemicals' },
  { value: 'agro_health', label: 'Agro-health / Crop Science' },
  { value: 'academic_basic', label: 'Academic / Basic Research' },
]

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function NewProjectDialog({ open, onOpenChange, onCreated }: NewProjectDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [domain, setDomain] = useState<DomainType>('pharma_clinical')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) { setError('Project name is required'); return }
    setLoading(true)
    setError('')
    try {
      await createProject(name.trim(), description.trim(), domain)
      setName(''); setDescription(''); setDomain('pharma_clinical')
      onCreated()
      onOpenChange(false)
    } catch {
      setError('Failed to create project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Research Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Project Name</Label>
            <Input
              id="proj-name"
              placeholder="e.g. Oncology Phase II — KRAS inhibitors"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="proj-desc"
              placeholder="Research objective, scope, target indication…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Domain</Label>
            <Select value={domain} onValueChange={(v) => setDomain(v as DomainType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOMAINS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
