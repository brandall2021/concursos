import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import { dominioPermitido } from './dominios'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      const email = user.email.toLowerCase()

      if (!dominioPermitido(email)) {
        console.warn(`[auth] Login rechazado por dominio: ${email}`)
        return false
      }

      if (email === process.env.ADMIN_EMAIL?.toLowerCase()) return true
      const existing = await prisma.user.findUnique({ where: { email } })
      if (!existing) console.warn(`[auth] Login rechazado: ${email} no está en la whitelist`)
      return Boolean(existing)
    },
    async session({ session, user }) {
      session.user.id = user.id
      session.user.role = user.role ?? 'NONE'
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
  },
})
