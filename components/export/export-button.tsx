'use client'

import { useState } from 'react'
import { Download, FileText, Sheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ExportOption {
  label: string
  description: string
  icon: 'pdf' | 'excel'
  onClick: () => Promise<void>
}

interface ExportButtonProps {
  options: ExportOption[]
  size?: 'sm' | 'default'
}

export function ExportButton({ options, size = 'sm' }: ExportButtonProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handle = async (opt: ExportOption) => {
    setLoading(opt.label)
    try {
      await opt.onClick()
    } finally {
      setLoading(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} disabled={loading !== null}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Exporting…' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Export as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.label}
            onClick={() => handle(opt)}
            className="flex items-start gap-3 py-2.5 cursor-pointer"
          >
            <div className="shrink-0 mt-0.5">
              {opt.icon === 'pdf' ? (
                <FileText className="h-4 w-4 text-red-500" />
              ) : (
                <Sheet className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
