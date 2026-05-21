import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/login', '/auth/callback']

// Demo mode: bypass auth entirely when NEXT_PUBLIC_DEMO_MODE=true
// or when Supabase is not properly configured (placeholder values)
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return (
    url.startsWith('https://') &&
    !url.includes('your-project') &&
    !url.includes('placeholder') &&
    key.length > 20 &&
    !key.includes('placeholder') &&
    !key.includes('your-anon')
  )
}

// Next.js 16: renamed from middleware() to proxy()
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // /upload is public so guests can try uploading (anonymous auth handled client-side)
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith('/auth/'),
  ) || pathname.startsWith('/upload')

  // Demo mode or Supabase not configured → allow all traffic through
  if (
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    !isSupabaseConfigured()
  ) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session — wrapped in try/catch so a network error never breaks the app
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase unreachable — treat as unauthenticated
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
