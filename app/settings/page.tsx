'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LogOut, Mail, Server, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { healthCheck } from '@/lib/api'

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState<string | null>(null)
  const [apiStatus, setApiStatus] = React.useState<'ok' | 'error' | 'loading'>('loading')

  React.useEffect(() => {
    supabase().auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null)
    })
  }, [])

  React.useEffect(() => {
    healthCheck()
      .then(() => setApiStatus('ok'))
      .catch(() => setApiStatus('error'))
  }, [])

  const handleSignOut = async () => {
    await supabase().auth.signOut()
    router.push('/login')
  }

  return (
    <AppLayout title="Settings">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{email ?? 'Not logged in'}</p>
              </div>
            </div>
            <Separator />
            <Button variant="destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </CardContent>
        </Card>

        {/* API Status */}
        <Card>
          <CardHeader>
            <CardTitle>API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Server className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Backend API</p>
                <p className="text-sm text-muted-foreground">
                  {apiStatus === 'loading' && 'Checking...'}
                  {apiStatus === 'ok' && 'Connected'}
                  {apiStatus === 'error' && 'Unavailable'}
                </p>
              </div>
              {apiStatus === 'ok' && (
                <Badge className="bg-emerald-500/15 text-emerald-500 border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              )}
              {apiStatus === 'error' && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
