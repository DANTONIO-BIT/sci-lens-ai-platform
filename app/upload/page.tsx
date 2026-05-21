'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, CheckCircle2, XCircle, Loader2, ArrowRight, Plus
} from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Dropzone } from '@/components/upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { uploadPaper, getPaperStatus, listProjects, addPaperToProject, ProjectResponse } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FolderOpen } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PaperJob {
  localId: string        // browser-side UUID for React keys
  file: File
  status: 'uploading' | 'parsing' | 'analyzing' | 'complete' | 'error' | 'duplicate'
  progress: number
  paperId?: string       // backend UUID, available after upload
  error?: string
  existingPaperId?: string
}

const POLL_MS = 3000
const MAX_POLLS = 60   // 3 min timeout
const MAX_FILES = 5

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function UploadPage() {
  const router = useRouter()
  const [jobs, setJobs] = React.useState<PaperJob[]>([])
  const pollRefs = React.useRef<Record<string, ReturnType<typeof setInterval>>>({})
  const [projects, setProjects] = React.useState<ProjectResponse[]>([])
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('none')
  const [isGuest, setIsGuest] = React.useState<boolean | null>(null)
  const [guestUploadsUsed, setGuestUploadsUsed] = React.useState(0)
  const [guestAuthError, setGuestAuthError] = React.useState('')

  const GUEST_KEY = '_sl_guest_uploads'
  const GUEST_MAX = 5

  React.useEffect(() => {
    supabase().auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setIsGuest(true)
        setGuestUploadsUsed(parseInt(localStorage.getItem(GUEST_KEY) ?? '0'))
        return
      }
      setIsGuest(false)
      listProjects()
        .then((list) => setProjects(list.filter((p) => p.status === 'active')))
        .catch(() => {})
    })
  }, [])

  // Cleanup all intervals on unmount
  React.useEffect(() => {
    return () => Object.values(pollRefs.current).forEach(clearInterval)
  }, [])

  const updateJob = (localId: string, patch: Partial<PaperJob>) =>
    setJobs(prev => prev.map(j => j.localId === localId ? { ...j, ...patch } : j))

  const stopPoll = (localId: string) => {
    if (pollRefs.current[localId]) {
      clearInterval(pollRefs.current[localId])
      delete pollRefs.current[localId]
    }
  }

  const processPaper = async (job: PaperJob) => {
    const { localId, file } = job

    try {
      // Step 1 — upload
      updateJob(localId, { status: 'uploading', progress: 10 })
      const uploadResp = await uploadPaper(file)

      // Step 2 — parsing
      updateJob(localId, { status: 'parsing', progress: 35, paperId: uploadResp.paper_id })

      // Step 3 — poll for analysis
      updateJob(localId, { status: 'analyzing', progress: 55 })
      let attempts = 0

      pollRefs.current[localId] = setInterval(async () => {
        attempts++
        if (attempts > MAX_POLLS) {
          stopPoll(localId)
          updateJob(localId, { status: 'error', error: 'Analysis timed out. Try again.' })
          return
        }
        try {
          const statusResp = await getPaperStatus(uploadResp.paper_id)
          if (statusResp.status === 'analyzed') {
            stopPoll(localId)
            updateJob(localId, { status: 'complete', progress: 100 })
            if (selectedProjectId && selectedProjectId !== 'none') {
              addPaperToProject(selectedProjectId, uploadResp.paper_id).catch(() => {})
            }
          } else if (statusResp.status === 'failed') {
            stopPoll(localId)
            updateJob(localId, { status: 'error', error: 'Analysis failed. Please try again.' })
          } else {
            setJobs(prev => prev.map(j =>
              j.localId === localId
                ? { ...j, progress: Math.min((j.progress ?? 55) + 2, 92) }
                : j
            ))
          }
        } catch {
          // network blip — keep polling
        }
      }, POLL_MS)

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      // Check for duplicate (409)
      if (msg.includes('409')) {
        try {
          const detail = JSON.parse(msg.split('\n').pop() || '{}')
          if (detail.duplicate) {
            updateJob(localId, {
              status: 'duplicate',
              progress: 100,
              error: `Already uploaded: ${detail.title}`,
              existingPaperId: detail.existing_paper_id,
            })
            return
          }
        } catch {
          // fallthrough to generic error
        }
      }
      updateJob(localId, {
        status: 'error',
        error: msg,
      })
    }
  }

  const handleFilesAccepted = async (files: File[]) => {
    if (isGuest) {
      const remaining = GUEST_MAX - guestUploadsUsed
      if (remaining <= 0) return  // cap UI already hides dropzone
      const allowed = files.slice(0, remaining)
      // Auto sign-in anonymously so the API accepts the upload
      const { error } = await supabase().auth.signInAnonymously()
      if (error) {
        setGuestAuthError('Could not start session. Please sign in to upload.')
        return
      }
      setGuestAuthError('')
      const newCount = guestUploadsUsed + allowed.length
      localStorage.setItem(GUEST_KEY, String(newCount))
      setGuestUploadsUsed(newCount)
      const newJobs: PaperJob[] = allowed.map(file => ({
        localId: crypto.randomUUID(), file, status: 'uploading', progress: 0,
      }))
      setJobs(prev => [...prev, ...newJobs])
      newJobs.forEach(job => processPaper(job))
      return
    }
    const newJobs: PaperJob[] = files.map(file => ({
      localId: crypto.randomUUID(),
      file,
      status: 'uploading',
      progress: 0,
    }))
    setJobs(prev => [...prev, ...newJobs])
    newJobs.forEach(job => processPaper(job))
  }

  const removeJob = (localId: string) => {
    stopPoll(localId)
    setJobs(prev => prev.filter(j => j.localId !== localId))
  }

  const clearCompleted = () => {
    jobs.filter(j => j.status === 'complete' || j.status === 'error')
      .forEach(j => stopPoll(j.localId))
    setJobs(prev => prev.filter(j => j.status !== 'complete' && j.status !== 'error'))
  }

  const activeJobs = jobs.filter(j => j.status !== 'complete' && j.status !== 'error')
  const doneJobs = jobs.filter(j => j.status === 'complete' || j.status === 'error')
  const canAddMore = activeJobs.length < MAX_FILES

  return (
    <AppLayout title="Upload Papers">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Analyze Research Papers</h1>
          <p className="text-muted-foreground">
            Upload up to {MAX_FILES} PDFs at once — each is analyzed in parallel.
          </p>
        </div>

        {/* Guest auth error */}
        {guestAuthError && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
              <p className="text-sm text-destructive">{guestAuthError}</p>
              <Button size="sm" onClick={() => router.push('/login')}>Sign in</Button>
            </CardContent>
          </Card>
        )}

        {/* Guest banner */}
        {isGuest === true && guestUploadsUsed < GUEST_MAX && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Try SciLens — <strong>{GUEST_MAX - guestUploadsUsed} free upload{GUEST_MAX - guestUploadsUsed !== 1 ? 's' : ''}</strong> remaining. No account needed.
              </p>
              <Button size="sm" variant="outline" onClick={() => router.push('/login')}>
                Sign in for unlimited <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Guest limit reached */}
        {isGuest === true && guestUploadsUsed >= GUEST_MAX && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <p className="text-lg font-medium">Free limit reached</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                You've used your {GUEST_MAX} free uploads. Create an account to continue analyzing papers.
              </p>
              <Button onClick={() => router.push('/login')}>
                Create free account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Project selector — registered users only */}
        {isGuest === false && projects.length > 0 && (
          <div className="flex items-center gap-3">
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Assign to a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Dropzone — visible when slots available and (registered OR guest with quota) */}
        {canAddMore && isGuest !== null && (isGuest === false || guestUploadsUsed < GUEST_MAX) && (
          <Card>
            <CardContent className="pt-6">
              <Dropzone
                onFilesAccepted={handleFilesAccepted}
                maxFiles={isGuest ? Math.min(GUEST_MAX - guestUploadsUsed, MAX_FILES - activeJobs.length) : MAX_FILES - activeJobs.length}
                disabled={!canAddMore}
              />
            </CardContent>
          </Card>
        )}

        {/* Queue full notice */}
        {!canAddMore && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4 text-center text-sm text-primary">
              {MAX_FILES} papers processing — wait for one to finish before adding more.
            </CardContent>
          </Card>
        )}

        {/* Active jobs */}
        <AnimatePresence>
          {activeJobs.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Processing</CardTitle>
                  <CardDescription>{activeJobs.length} paper{activeJobs.length > 1 ? 's' : ''} in queue</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeJobs.map(job => (
                    <PaperJobRow key={job.localId} job={job} onRemove={removeJob} />
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completed / failed jobs */}
        <AnimatePresence>
          {doneJobs.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Done</CardTitle>
                    <CardDescription>{doneJobs.length} paper{doneJobs.length > 1 ? 's' : ''} finished</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearCompleted}>Clear all</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {doneJobs.map(job => (
                    <PaperJobRow
                      key={job.localId}
                      job={job}
                      onRemove={removeJob}
                      onView={id => router.push(`/analysis/${id}`)}
                    />
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {jobs.length === 0 && isGuest !== null && (
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: 'Batch Upload', description: `Upload up to ${MAX_FILES} PDFs simultaneously` },
              { title: 'Processing Time', description: 'Most papers analyzed in under 60 seconds' },
              { title: 'Data Security', description: 'Files encrypted in transit and stored privately' },
            ].map(info => (
              <Card key={info.title} className="bg-muted/30">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-sm">{info.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ---------------------------------------------------------------------------
// Single paper row — shows file name + progress + actions
// ---------------------------------------------------------------------------
function PaperJobRow({
  job,
  onRemove,
  onView,
}: {
  job: PaperJob
  onRemove: (id: string) => void
  onView?: (paperId: string) => void
}) {
  const router = useRouter()
  const statusLabel: Record<PaperJob['status'], string> = {
    uploading: 'Uploading…',
    parsing: 'Extracting text…',
    analyzing: 'AI analyzing…',
    complete: 'Complete',
    error: 'Failed',
    duplicate: 'Duplicate',
  }

  const isActive = job.status !== 'complete' && job.status !== 'error' && job.status !== 'duplicate'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3"
    >
      {/* Icon */}
      <div className="shrink-0">
        {job.status === 'complete' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
        {job.status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
        {job.status === 'duplicate' && <FileText className="h-5 w-5 text-yellow-500" />}
        {isActive && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
      </div>

      {/* Info + progress */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{job.file.name}</p>
          <span className="text-xs text-muted-foreground shrink-0">{statusLabel[job.status]}</span>
        </div>
        {isActive && <Progress value={job.progress} className="h-1.5" />}
        {job.status === 'error' && (
          <p className="text-xs text-destructive">{job.error}</p>
        )}
        {job.status === 'duplicate' && job.existingPaperId && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">{job.error}</p>
            <Button
              size="sm"
              variant="link"
              className="h-auto p-0 text-xs text-yellow-600 dark:text-yellow-400"
              onClick={() => router.push(`/analysis/${job.existingPaperId}`)}
            >
              View existing <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex gap-1">
        {job.status === 'complete' && job.paperId && onView && (
          <Button size="sm" variant="outline" onClick={() => onView(job.paperId!)}>
            View <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRemove(job.localId)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isActive ? 'Cancel' : 'Dismiss'}
        </Button>
      </div>
    </motion.div>
  )
}
