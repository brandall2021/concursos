import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'

// NextAuth: protege /admin (páginas) y /api/admin (401 en APIs).
const authProxy = auth((req) => {
  const isLoginPage = req.nextUrl.pathname === '/admin/login'
  if (isLoginPage || req.auth) return

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const loginUrl = new URL('/admin/login', req.url)
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
})

/* Sondas de bots sobre el endpoint de Server Actions: POST con header
 * `next-action` cuyo ID no respeta el formato esperado ("x", "action", "1",
 * "0"...). Next 16 valida en su runtime que el Server Reference ID mida
 * exactamente 42 caracteres (SERVER_REFERENCE_ID_LENGTH en
 * dist/shared/lib/server-reference-info.js) y en cualquier otro caso registra
 * un error crudo con stack trace. Cortamos el pedido acá con un 400 limpio:
 * el runtime no se entera y el log deja de llenarse de ruido.
 * En desarrollo los IDs siguen otro formato; la longitud fija vale en producción. */
function esSondaInvalida(req: NextRequest): boolean {
  if (req.method !== 'POST') return false
  const id = req.headers.get('next-action')
  if (!id) return false
  if (process.env.NODE_ENV !== 'production') return false
  return id.trim().length !== 42
}

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  if (esSondaInvalida(req)) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const path = req.nextUrl.pathname
  if (path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/admin')) {
    return authProxy(req, event as unknown as Parameters<typeof authProxy>[1])
  }

  return
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
