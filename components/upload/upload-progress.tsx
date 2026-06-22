'use client'

import { motion } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface UploadProgressProps {
  progress: number
  status: 'uploading' | 'parsing' | 'analyzing' | 'complete'
}

const statusMessages = {
  uploading: 'Uploading your paper...',
  parsing: 'Extracting text and metadata...',
  analyzing: 'Running AI analysis...',
  complete: 'Analysis complete!',
}

const statusDetails = {
  uploading: 'Securely transferring your PDF to our servers',
  parsing: 'Using PyMuPDF to extract structured content',
  analyzing: 'AI synthesizing TRL, market validation, and risk factors',
  complete: 'Your research intelligence report is ready',
}

export function UploadProgress({ progress, status }: UploadProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{statusMessages[status]}</p>
          <p className="text-sm text-muted-foreground">{statusDetails[status]}</p>
        </div>
        <span className="text-2xl font-bold font-mono tabular-nums">
          {progress}%
        </span>
      </div>
      
      <Progress 
        value={progress} 
        className={cn(
          'h-2',
          status === 'complete' && '[&>div]:bg-trl-high'
        )}
      />

      {status === 'analyzing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 gap-4 pt-4"
        >
          {[
            { label: 'TRL Score', status: progress > 50 ? 'done' : 'processing' },
            { label: 'Market Validation', status: progress > 70 ? 'done' : progress > 50 ? 'processing' : 'pending' },
            { label: 'Risk Analysis', status: progress > 90 ? 'done' : progress > 70 ? 'processing' : 'pending' },
          ].map((item) => (
            <div 
              key={item.label}
              className={cn(
                'rounded-lg border p-3 text-center transition-colors',
                item.status === 'done' && 'border-trl-high/30 bg-trl-high/10',
                item.status === 'processing' && 'border-primary/30 bg-primary/10',
                item.status === 'pending' && 'border-border bg-muted/50'
              )}
            >
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className={cn(
                'text-sm font-medium',
                item.status === 'done' && 'text-trl-high',
                item.status === 'processing' && 'text-primary',
                item.status === 'pending' && 'text-muted-foreground'
              )}>
                {item.status === 'done' ? 'Complete' : 
                 item.status === 'processing' ? 'Processing...' : 'Pending'}
              </p>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
