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

  // Privacy Policy / Terms of Service — must be reachable without a session,
  // since Meta (and anyone else) needs to view these while logged out. No
  // redirect-away-if-authenticated behavior needed, unlike /login.
  if (pathname === '/privacy-policy' || pathname === '/terms-of-service') {
    return NextResponse.next()
  }

  // Public marketing homepage — Google's OAuth branding verification requires
  // the app's homepage to explain its purpose without requiring login first.
  // page.tsx itself still redirects an authenticated visitor onward.
  if (pathname === '/') {
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
