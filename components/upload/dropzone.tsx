'use client'

import * as React from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface DropzoneProps {
  onFileAccepted: (file: File) => void
  disabled?: boolean
}

export function Dropzone({ onFileAccepted, disabled }: DropzoneProps) {
  const [file, setFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const onDrop = React.useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 50MB.')
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload a PDF file.')
      } else {
        setError('File upload failed. Please try again.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0]
      setFile(selectedFile)
      onFileAccepted(selectedFile)
    }
  }, [onFileAccepted])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 1,
    disabled,
  })

  const removeFile = () => {
    setFile(null)
    setError(null)
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all cursor-pointer',
                'hover:border-primary/50 hover:bg-primary/5',
                isDragActive && !isDragReject && 'border-primary bg-primary/10',
                isDragReject && 'border-destructive bg-destructive/10',
                disabled && 'cursor-not-allowed opacity-50',
                error && 'border-destructive'
              )}
            >
              <input {...getInputProps()} />
              
              <motion.div
                animate={{ 
                  scale: isDragActive ? 1.1 : 1,
                  y: isDragActive ? -5 : 0 
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-full mb-4',
                  isDragActive ? 'bg-primary/20' : 'bg-muted'
                )}
              >
                <Upload className={cn(
                  'h-8 w-8',
                  isDragActive ? 'text-primary' : 'text-muted-foreground'
                )} />
              </motion.div>

              <p className="text-lg font-medium mb-1">
                {isDragActive 
                  ? 'Drop your paper here' 
                  : 'Drag & drop your research paper'
                }
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse files
              </p>
              <p className="text-xs text-muted-foreground">
                PDF files only, max 50MB
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="file-preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-4 rounded-xl border bg-card p-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!disabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4" />
          {error}
        </motion.div>
      )}
    </div>
  )
}
