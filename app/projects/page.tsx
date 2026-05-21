'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NewProjectDialog } from '@/components/projects/new-project-dialog'
import { listProjects, ProjectResponse } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { DemoBanner } from '@/components/demo-banner'
import { Plus, FolderOpen, FlaskConical, ArrowRight, Loader2 } from 'lucide-react'

const DOMAIN_LABELS: Record<string, string> = {
  pharma_clinical: 'Pharma Clinical',
  pharma_industrial: 'Pharma Industrial',
  biotech: 'Biotechnology',
  medical_device: 'Medical Device',
  chemicals: 'Chemicals',
  agro_health: 'Agro-health',
  academic_basic: 'Academic',
}

const DOMAIN_COLORS: Record<string, string> = {
  pharma_clinical: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  pharma_industrial: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  biotech: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  medical_device: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  chemicals: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  agro_health: 'bg-green-500/10 text-green-600 border-green-500/20',
  academic_basic: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data: { session } } = await supabase().auth.getSession()
    if (!session) {
      const { mockProjects } = await import('@/lib/mock-data')
      // Convert ResearchProject → ProjectResponse shape
      setProjects(mockProjects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        domain: p.domain,
        status: p.status,
        created_at: p.createdAt,
        paper_count: p.paperCount,
      })))
      setIsGuest(true)
      setLoading(false)
      return
    }
    listProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const active = projects.filter((p) => p.status === 'active')
  const archived = projects.filter((p) => p.status === 'archived')

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Research Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Group papers into research initiatives and track portfolio metrics
            </p>
          </div>
          {!isGuest && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
        </div>

        {isGuest && <DemoBanner />}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-medium">No projects yet</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create your first research project to start grouping papers
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Active ({active.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {active.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
              </section>
            )}
            {archived.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Archived ({archived.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archived.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <NewProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={load} />
    </AppLayout>
  )
}

function ProjectCard({ project }: { project: ProjectResponse }) {
  const domainColor = DOMAIN_COLORS[project.domain] ?? 'bg-gray-500/10 text-gray-600'

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold leading-snug line-clamp-2">
              {project.name}
            </CardTitle>
            <Badge variant="outline" className={`text-xs shrink-0 ${domainColor}`}>
              {DOMAIN_LABELS[project.domain] ?? project.domain}
            </Badge>
          </div>
          {project.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FlaskConical className="h-3.5 w-3.5" />
              <span>{project.paper_count} paper{project.paper_count !== 1 ? 's' : ''}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
