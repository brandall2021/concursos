'use client'

import { useState } from 'react'
import { Button } from './ui/Button'
import { removeUsuario } from '@/actions/usuarios'

interface Usuario {
  id: string
  email: string
  name: string | null
  createdAt: Date
}

export function UsuariosTable({ usuarios, currentUserId }: { usuarios: Usuario[]; currentUserId: string }) {
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRemove(id: string) {
    setPending(id)
    setError(null)
    const result = await removeUsuario(id)
    if (result && 'error' in result) setError(result.error)
    setPending(null)
  }

  return (
    <section className="space-y-3">
      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Alta</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-semibold text-face-blue">{usuario.email}</td>
                  <td className="px-5 py-3 text-gray-600">{usuario.name ?? 'Sin nombre'}</td>
                  <td className="px-5 py-3 text-gray-500">{usuario.createdAt.toLocaleDateString('es-AR')}</td>
                  <td className="px-5 py-3 text-right">
                    {usuario.id === currentUserId ? (
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Actual</span>
                    ) : (
                      <Button
                        variant="danger"
                        onClick={() => handleRemove(usuario.id)}
                        disabled={pending === usuario.id}
                      >
                        {pending === usuario.id ? 'Quitando...' : 'Quitar'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
