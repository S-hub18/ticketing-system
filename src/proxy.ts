import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (token) {
    const role = token.role as string

    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      if (role === 'AGENT') return NextResponse.redirect(new URL('/agent/queue', req.url))
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    if (pathname.startsWith('/agent') && !['AGENT', 'ADMIN'].includes(role)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    if (pathname === '/login' || pathname === '/') {
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      if (role === 'AGENT') return NextResponse.redirect(new URL('/agent/queue', req.url))
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public|logout|signout).*)'],
}
