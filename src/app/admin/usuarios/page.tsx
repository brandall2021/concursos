import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { addUsuario } from '@/actions/usuarios'
import { UsuariosTable } from '@/components/UsuariosTable'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

async function handleAddUsuario(formData: FormData) {
  'use server'
  await addUsuario(formData)
}

export default async function UsuariosPage() {
  const session = await auth()
  const usuarios = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-face-red">Accesos</p>
        <h1 className="mt-1 text-2xl font-bold text-face-blue">Administradores</h1>
        <p className="mt-1 text-sm text-gray-500">Agregá o quitá usuarios con acceso al panel.</p>
      </header>

      <section className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
        <form action={handleAddUsuario} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input label="Agregar admin por email" name="email" type="email" placeholder="usuario@example.com" />
          <Button type="submit">Agregar</Button>
        </form>
      </section>

      <UsuariosTable usuarios={usuarios} currentUserId={session?.user?.id ?? ''} />
    </div>
  )
}
