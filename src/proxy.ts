import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoginPage = req.nextUrl.pathname === '/admin/login'
  if (isLoginPage || req.auth) return

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const loginUrl = new URL('/admin/login', req.url)
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
})

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
