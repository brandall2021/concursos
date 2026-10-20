'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/admin/login')
}

export type UsuarioActionResult = { error: string } | { success: true } | void

export async function addUsuario(formData: FormData): Promise<UsuarioActionResult> {
  await requireAdmin()
  const email = (formData.get('email') as string).trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email inválido' }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: 'Este email ya está registrado como administrador' }

  await prisma.user.create({ data: { email, role: 'ADMIN' } })
  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function removeUsuario(id: string): Promise<UsuarioActionResult> {
  await requireAdmin()

  const count = await prisma.user.count()
  if (count <= 1) {
    return { error: 'No podés eliminar el único administrador del sistema' }
  }

  await prisma.user.delete({ where: { id } })
  revalidatePath('/admin/usuarios')
}
