'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Search, User } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const router = useRouter()
  const [userEmail, setUserEmail] = React.useState<string | null>(null)

  React.useEffect(() => {
    supabase().auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase().auth.signOut()
    router.push('/login')
  }

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : 'SL'
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        )}
      </div>

      {/* Center - Search */}
      <div className="hidden flex-1 max-w-md mx-8 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search papers, analyses, tags..."
            className="w-full pl-9 bg-secondary/50 border-transparent focus:border-border focus:bg-background"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              <Badge 
                variant="destructive" 
                className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center"
              >
                3
              </Badge>
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="font-medium">Analysis Complete</span>
              <span className="text-xs text-muted-foreground">
                CRISPR Gene Editing paper analysis is ready
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="font-medium">New Paper Uploaded</span>
              <span className="text-xs text-muted-foreground">
                Solid-State Battery Architecture is being processed
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="font-medium">Weekly Report Ready</span>
              <span className="text-xs text-muted-foreground">
                Your research summary for this week is available
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userEmail ?? 'Guest'}</p>
                <p className="text-xs text-muted-foreground">SciLens account</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
