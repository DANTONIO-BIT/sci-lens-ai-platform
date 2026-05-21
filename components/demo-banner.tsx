'use client'

import Link from 'next/link'
import { FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DemoBanner() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <FlaskConical className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <span className="font-medium">Demo mode</span> — you're viewing sample data.
          Sign in to upload and analyze your own research papers.
        </p>
      </div>
      <Link href="/login" className="shrink-0">
        <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
          Sign in
        </Button>
      </Link>
    </div>
  )
}
