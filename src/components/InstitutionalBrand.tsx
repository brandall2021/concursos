import Image from 'next/image'

export function InstitutionalBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center">
      <Image
        src="/logo-header-dark.png"
        alt="Universidad Nacional de Tucumán — Facultad de Ciencias Económicas"
        width={compact ? 190 : 330}
        height={compact ? 43 : 75}
        priority
        className={compact ? 'h-auto w-[190px]' : 'h-auto w-[330px]'}
      />
    </div>
  )
}
