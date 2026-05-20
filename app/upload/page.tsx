'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Dropzone, ProcessingSteps, UploadProgress } from '@/components/upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { uploadPaper, getPaperStatus } from '@/lib/api'
import type { UploadState } from '@/lib/types'

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 60 // 3 min timeout

export default function UploadPage() {
  const router = useRouter()
  const [uploadState, setUploadState] = React.useState<UploadState>({
    file: null,
    status: 'idle',
    progress: 0,
    currentStep: 1,
  })
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  React.useEffect(() => () => stopPolling(), [])

  const handleFileAccepted = async (file: File) => {
    setUploadState({ file, status: 'uploading', progress: 10, currentStep: 1 })

    try {
      // Step 1 → 2: Upload to backend
      const uploadResp = await uploadPaper(file)
      setUploadState(prev => ({
        ...prev,
        status: 'parsing',
        progress: 35,
        currentStep: 2,
        paperId: uploadResp.paper_id,
      }))

      // Step 3: Poll for analysis completion
      setUploadState(prev => ({ ...prev, status: 'analyzing', progress: 55, currentStep: 3 }))

      let attempts = 0
      pollRef.current = setInterval(async () => {
        attempts++
        if (attempts > POLL_MAX_ATTEMPTS) {
          stopPolling()
          setUploadState(prev => ({ ...prev, status: 'error', error: 'Analysis timed out. Try again.' }))
          return
        }

        try {
          const statusResp = await getPaperStatus(uploadResp.paper_id)
          if (statusResp.status === 'analyzed') {
            stopPolling()
            setUploadState(prev => ({
              ...prev,
              status: 'complete',
              progress: 100,
              currentStep: 4,
            }))
          } else if (statusResp.status === 'failed') {
            stopPolling()
            setUploadState(prev => ({
              ...prev,
              status: 'error',
              error: 'Analysis failed. Please try uploading again.',
            }))
          } else {
            setUploadState(prev => ({
              ...prev,
              progress: Math.min(prev.progress + 3, 90),
            }))
          }
        } catch {
          // Network hiccup — keep polling
        }
      }, POLL_INTERVAL_MS)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setUploadState(prev => ({ ...prev, status: 'error', error: message }))
    }
  }

  const handleViewAnalysis = () => {
    if (uploadState.paperId) {
      router.push(`/analysis/${uploadState.paperId}`)
    }
  }

  const handleUploadAnother = () => {
    stopPolling()
    setUploadState({ file: null, status: 'idle', progress: 0, currentStep: 1 })
  }

  return (
    <AppLayout title="Upload Paper">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Analyze a Research Paper
          </h1>
          <p className="text-muted-foreground">
            Upload a PDF and get TRL scores, TAM estimates, and risk analysis in seconds.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analysis Pipeline</CardTitle>
            <CardDescription>
              Your paper goes through our AI-powered analysis system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProcessingSteps
              currentStep={uploadState.currentStep}
              status={uploadState.status}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              {uploadState.status === 'idle' && (
                <motion.div key="dropzone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Dropzone onFileAccepted={handleFileAccepted} disabled={false} />
                </motion.div>
              )}

              {(['uploading', 'parsing', 'analyzing'] as const).some(s => s === uploadState.status) && (
                <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <UploadProgress
                    progress={uploadState.progress}
                    status={uploadState.status as 'uploading' | 'parsing' | 'analyzing'}
                  />
                </motion.div>
              )}

              {uploadState.status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 space-y-4"
                >
                  <p className="text-destructive font-medium">{uploadState.error}</p>
                  <Button variant="outline" onClick={handleUploadAnother}>Try again</Button>
                </motion.div>
              )}

              {uploadState.status === 'complete' && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 mb-4"
                  >
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2">Analysis Complete!</h3>
                  <p className="text-muted-foreground mb-6">
                    Your research paper has been successfully analyzed.
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <Button onClick={handleViewAnalysis} size="lg">
                      View Analysis
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={handleUploadAnother} size="lg">
                      Upload Another
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: 'Supported Formats', description: 'PDF files from arXiv, PubMed, journals, and preprints' },
            { title: 'Processing Time', description: 'Most papers analyzed in under 30 seconds' },
            { title: 'Data Security', description: 'Files encrypted in transit and stored in your private bucket' },
          ].map((info) => (
            <Card key={info.title} className="bg-muted/30">
              <CardContent className="pt-4">
                <h4 className="font-medium text-sm">{info.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
