'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { dominioPermitido } from '@/lib/dominios'
import { revalidatePath } from 'next/cache'

export type UsuarioActionResult = { error: string } | { success: true } | void

const LARGO_MAX_EMAIL = 254

export async function addUsuario(formData: FormData): Promise<UsuarioActionResult> {
  await requireAdmin()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email || email.length > LARGO_MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email inválido' }
  }

  if (!dominioPermitido(email)) {
    return { error: 'Ese dominio no está habilitado (AUTH_ALLOWED_DOMAINS)' }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: 'Este email ya está registrado como administrador' }

  await prisma.user.create({ data: { email } })
  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function removeUsuario(id: string): Promise<UsuarioActionResult> {
  const session = await requireAdmin()

  if (typeof id !== 'string' || id.length === 0) return { error: 'Usuario no válido' }
  if (id === session.user.id) return { error: 'No podés quitarte a vos mismo' }

  const [count, objetivo] = await Promise.all([
    prisma.user.count(),
    prisma.user.findUnique({ where: { id } }),
  ])
  if (!objetivo) return { error: 'El usuario no existe' }
  if (count <= 1) return { error: 'No podés eliminar el único administrador del sistema' }

  await prisma.user.delete({ where: { id } })
  revalidatePath('/admin/usuarios')
}
