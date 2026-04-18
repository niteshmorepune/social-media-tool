import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const role = session?.user?.role

  // Public routes — always accessible
  if (pathname === '/login') {
    // Redirect already-logged-in users to their home
    if (session) {
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
