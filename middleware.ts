import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const role = session?.user?.role

  // Public routes — always accessible
  if (pathname === '/login' || pathname === '/sso') {
    // /sso is the cross-portal SSO handoff — it must be reachable without an
    // existing session, since its whole job is to establish one from a
    // one-time token. Only /login redirects an already-authenticated user away.
    if (pathname === '/login' && session) {
      if (role === 'CLIENT') return NextResponse.redirect(new URL('/portal', req.url))
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // All other routes require authentication
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Client portal — only CLIENT role
  if (pathname.startsWith('/portal')) {
    if (role !== 'CLIENT') return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.next()
  }

  // Team management — only ADMIN
  if (pathname.startsWith('/team')) {
    if (role !== 'ADMIN') return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.next()
  }

  // Admin + Team routes — block CLIENT role
  if (role === 'CLIENT') {
    return NextResponse.redirect(new URL('/portal', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)']
}
