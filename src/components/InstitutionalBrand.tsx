import Image from 'next/image'

export function InstitutionalBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo-face.png"
        alt="Facultad de Ciencias Económicas - Universidad Nacional de Tucumán"
        width={compact ? 150 : 230}
        height={compact ? 46 : 70}
        priority
        className={compact ? 'h-auto w-[150px]' : 'h-auto w-[230px]'}
      />
      {!compact && (
        <div className="hidden border-l border-gray-200 pl-4 sm:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-face-red">Universidad Nacional de Tucumán</p>
          <p className="text-sm font-semibold text-gray-700">Concursos Docentes · Titulares, Asociados y Adjuntos</p>
        </div>
      )}
    </div>
  )
}
