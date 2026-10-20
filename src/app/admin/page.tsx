import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import Link from 'next/link'
import { ConcursoStatusBadge } from '@/components/ConcursoStatusBadge'
import { CARGO_LABELS } from '@/lib/concurso-status'

export default async function AdminDashboard() {
  await requireAdmin()
  const now = new Date()
  const [totalConcursos, totalPostulantes, concursosActivos, recientes] = await Promise.all([
    prisma.concurso.count(),
    prisma.postulante.count(),
    prisma.concurso.count({
      where: {
        fechaApertura: { lte: now },
        fechaCierre: { gte: now },
      },
    }),
    prisma.concurso.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 4,
      include: { _count: { select: { postulantes: true } } },
    }),
  ])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-face-red">Panel administrativo</p>
          <h1 className="mt-1 text-2xl font-bold text-face-blue">Dashboard</h1>
        </div>
        <Link href="/admin/concursos/nueva" className="text-sm font-semibold text-face-red hover:text-red-700">
          Crear concurso
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total concursos" value={totalConcursos} />
        <StatCard label="Concursos activos" value={concursosActivos} tone="success" />
        <StatCard label="Total postulantes" value={totalPostulantes} tone="info" />
      </section>

      <section className="rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-bold text-face-blue">Actividad reciente</h2>
          <p className="text-sm text-gray-500">Últimos llamados modificados.</p>
        </div>
        {recientes.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">Todavía no hay concursos creados.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recientes.map((concurso) => (
              <Link
                key={concurso.id}
                href={`/admin/concursos/${concurso.id}/postulantes`}
                className="flex flex-col gap-3 px-5 py-4 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-face-blue">
                      Expte. {concurso.numeroExpediente} — {CARGO_LABELS[concurso.cargo] ?? concurso.cargo}
                    </h3>
                    <ConcursoStatusBadge fechaApertura={concurso.fechaApertura} fechaCierre={concurso.fechaCierre} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {concurso._count.postulantes} postulante{concurso._count.postulantes !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-sm font-semibold text-face-red">Ver postulantes</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'success' | 'info'
}) {
  const tones = {
    neutral: 'border-gray-200 bg-white text-face-blue',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-blue-200 bg-blue-50 text-face-blue',
  }

  return (
    <div className={`rounded-md border p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}
