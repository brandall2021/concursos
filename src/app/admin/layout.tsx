import { auth, signOut } from '@/lib/auth'
import { InstitutionalBrand } from '@/components/InstitutionalBrand'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      {session && (
        <nav className="border-b border-gray-200 bg-white">
          <div className="h-2 bg-face-red" />
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
              <Link href="/admin">
                <InstitutionalBrand compact />
              </Link>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/admin" className="text-sm font-semibold text-gray-600 hover:text-face-red">
                  Dashboard
                </Link>
                <Link href="/admin/concursos" className="text-sm font-semibold text-gray-600 hover:text-face-red">
                  Concursos
                </Link>
                <Link href="/admin/usuarios" className="text-sm font-semibold text-gray-600 hover:text-face-red">
                  Usuarios
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="max-w-[220px] truncate text-sm text-gray-500">{session.user?.email}</span>
              <form action={async () => { 'use server'; await signOut({ redirectTo: '/admin/login' }) }}>
                <button type="submit" className="text-sm font-semibold text-face-blue hover:text-face-red">
                  Salir
                </button>
              </form>
            </div>
          </div>
        </nav>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
