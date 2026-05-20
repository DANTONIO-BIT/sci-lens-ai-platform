'use client'

import { motion } from 'framer-motion'
import { Check, Loader2, Upload, FileSearch, Brain, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProcessingStepsProps {
  currentStep: number
  status: 'idle' | 'uploading' | 'parsing' | 'analyzing' | 'complete' | 'error'
}

const steps = [
  { id: 1, label: 'Upload', description: 'Uploading PDF', icon: Upload },
  { id: 2, label: 'Parse', description: 'Extracting text & metadata', icon: FileSearch },
  { id: 3, label: 'Analyze', description: 'AI analysis in progress', icon: Brain },
  { id: 4, label: 'Complete', description: 'Analysis ready', icon: CheckCircle2 },
]

function getStepStatus(stepId: number, currentStep: number, status: string) {
  if (status === 'error') return 'error'
  if (stepId < currentStep) return 'complete'
  if (stepId === currentStep) return 'active'
  return 'pending'
}

export function ProcessingSteps({ currentStep, status }: ProcessingStepsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.id, currentStep, status)
          const isLast = index === steps.length - 1
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: stepStatus === 'active' ? 1.1 : 1,
                    backgroundColor: 
                      stepStatus === 'complete' ? 'var(--trl-high)' :
                      stepStatus === 'active' ? 'var(--primary)' :
                      'var(--muted)',
                  }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    stepStatus === 'complete' && 'bg-trl-high',
                    stepStatus === 'active' && 'bg-primary',
                    stepStatus === 'pending' && 'bg-muted',
                    stepStatus === 'error' && 'bg-destructive'
                  )}
                >
                  {stepStatus === 'complete' ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : stepStatus === 'active' ? (
                    <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" />
                  ) : (
                    <step.icon className={cn(
                      'h-5 w-5',
                      stepStatus === 'pending' ? 'text-muted-foreground' : 'text-destructive-foreground'
                    )} />
                  )}
                </motion.div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    'text-sm font-medium',
                    stepStatus === 'active' && 'text-primary',
                    stepStatus === 'complete' && 'text-trl-high',
                    stepStatus === 'pending' && 'text-muted-foreground'
                  )}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
              
              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-4 h-0.5 bg-muted relative overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ 
                      width: stepStatus === 'complete' || 
                             (stepStatus === 'active' && step.id < currentStep) 
                               ? '100%' : '0%' 
                    }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className="absolute inset-y-0 left-0 bg-trl-high"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
