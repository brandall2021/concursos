import Image from 'next/image'

export function InstitutionalBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center">
      <Image
        src="/logo-header-dark.png"
        alt="Universidad Nacional de Tucumán — Facultad de Ciencias Económicas"
        width={1046}
        height={190}
        priority
        className={compact ? 'h-auto w-[240px]' : 'h-auto w-[420px]'}
      />
    </div>
  )
}
