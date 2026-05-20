'use client'

import * as React from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { Upload, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DropzoneProps {
  onFilesAccepted: (files: File[]) => void
  disabled?: boolean
  maxFiles?: number
}

export function Dropzone({ onFilesAccepted, disabled, maxFiles = 5 }: DropzoneProps) {
  const [error, setError] = React.useState<string | null>(null)

  const onDrop = React.useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)

    if (rejectedFiles.length > 0) {
      const code = rejectedFiles[0].errors[0]?.code
      if (code === 'file-too-large') setError('One or more files exceed 50MB.')
      else if (code === 'file-invalid-type') setError('Only PDF files are supported.')
      else if (code === 'too-many-files') setError(`Maximum ${maxFiles} files at a time.`)
      else setError('Upload failed. Please try again.')
      return
    }

    if (acceptedFiles.length > 0) {
      onFilesAccepted(acceptedFiles)
    }
  }, [onFilesAccepted, maxFiles])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
    maxFiles,
    disabled,
  })

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all cursor-pointer',
          'hover:border-primary/50 hover:bg-primary/5',
          isDragActive && !isDragReject && 'border-primary bg-primary/10',
          isDragReject && 'border-destructive bg-destructive/10',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-destructive'
        )}
      >
        <input {...getInputProps()} />

        <motion.div
          animate={{ scale: isDragActive ? 1.1 : 1, y: isDragActive ? -5 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full mb-3',
            isDragActive ? 'bg-primary/20' : 'bg-muted'
          )}
        >
          <Upload className={cn('h-7 w-7', isDragActive ? 'text-primary' : 'text-muted-foreground')} />
        </motion.div>

        <p className="text-base font-medium mb-1">
          {isDragActive ? 'Drop your papers here' : 'Drag & drop research papers'}
        </p>
        <p className="text-sm text-muted-foreground mb-1">or click to browse files</p>
        <p className="text-xs text-muted-foreground">
          PDF only · Max 50MB per file · Up to {maxFiles} files at once
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </motion.div>
      )}
    </div>
  )
}
