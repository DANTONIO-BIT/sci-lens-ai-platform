'use client'

import Link from 'next/link'
import { Upload, Network, FileText, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function QuickActions() {
  const actions = [
    {
      label: 'Upload Paper',
      description: 'Analyze a new research paper',
      icon: Upload,
      href: '/upload',
      variant: 'default' as const,
    },
    {
      label: 'View Graph',
      description: 'Explore research network',
      icon: Network,
      href: '/graph',
      variant: 'outline' as const,
    },
    {
      label: 'Browse Papers',
      description: 'See all analyzed papers',
      icon: FileText,
      href: '/dashboard/papers',
      variant: 'outline' as const,
    },
    {
      label: 'Top Market',
      description: 'Highest validation score',
      icon: TrendingUp,
      href: '/dashboard/top-tam',
      variant: 'outline' as const,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {actions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Button
              variant={action.variant}
              className="w-full justify-start h-auto py-3"
            >
              <action.icon className="h-4 w-4 mr-3 shrink-0" />
              <div className="flex flex-col items-start">
                <span className="font-medium">{action.label}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {action.description}
                </span>
              </div>
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
