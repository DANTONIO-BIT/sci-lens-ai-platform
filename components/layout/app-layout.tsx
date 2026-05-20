'use client'

import * as React from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} />
        <main className={cn(
          'flex-1 overflow-auto p-6',
          'bg-muted/30'
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}
