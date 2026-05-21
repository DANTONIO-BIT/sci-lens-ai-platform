'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Microscope, Mail, ArrowRight, CheckCircle2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'

const isSupabaseReady =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project') &&
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0) > 20 &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('your-anon')

// Inner component — uses useSearchParams(), must be inside <Suspense>
function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = React.useState('')
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error, setError] = React.useState('')

  const authError = searchParams.get('error')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setError('')

    const { error: signInError } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signInError) {
      setStatus('error')
      setError(signInError.message)
    } else {
      setStatus('sent')
    }
  }

  const handleDemo = () => {
    router.push('/upload')
  }

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
          <Microscope className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold tracking-tight">SciLens</span>
      </div>

      {/* Demo Banner — visible when Supabase not configured */}
      {!isSupabaseReady && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3"
        >
          <p className="text-sm text-primary font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 shrink-0" />
            Demo mode — Supabase no configurado aún
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Puedes explorar el dashboard con datos de ejemplo sin registrarte.
          </p>
        </motion.div>
      )}

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {status === 'sent' ? 'Revisa tu email' : 'Accede a SciLens'}
          </CardTitle>
          <CardDescription>
            {status === 'sent'
              ? `Enviamos un magic link a ${email}`
              : 'Sin contraseña — solo tu email'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <AnimatePresence mode="wait">
            {status === 'sent' ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4 space-y-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2"
                >
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </motion.div>
                <p className="text-sm text-muted-foreground">
                  Haz clic en el enlace del email para entrar. Expira en 1 hora.
                </p>
                <Button variant="ghost" size="sm" onClick={() => setStatus('idle')}>
                  Usar otro email
                </Button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Magic Link form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {(error || authError) && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                      {error || 'Autenticación fallida. Intenta de nuevo.'}
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                        required
                        disabled={status === 'loading' || !isSupabaseReady}
                      />
                    </div>
                    {!isSupabaseReady && (
                      <p className="text-xs text-muted-foreground">
                        Configura Supabase en <code>.env.local</code> para activar el login.
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={status === 'loading' || !email.trim() || !isSupabaseReady}
                  >
                    {status === 'loading' ? 'Enviando...' : (
                      <>Enviar magic link <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </form>

                {/* Demo separator */}
                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    o
                  </span>
                </div>

                {/* Demo access */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDemo}
                >
                  <Zap className="mr-2 h-4 w-4 text-primary" />
                  Try without account — upload a paper
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        No account needed to try — upload up to 5 PDFs for free.
      </p>
    </div>
  )
}

// Outer page — wraps LoginContent in Suspense (required by Next.js 16 for useSearchParams)
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <React.Suspense fallback={
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <Microscope className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight">SciLens</span>
        </div>
      }>
        <LoginContent />
      </React.Suspense>
    </div>
  )
}
