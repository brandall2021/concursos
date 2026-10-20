import Image from 'next/image'

export function InstitutionalBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center">
      <Image
        src="/logo-unt-face.png"
        alt="Universidad Nacional de Tucumán — Facultad de Ciencias Económicas"
        width={compact ? 180 : 320}
        height={compact ? 61 : 108}
        priority
        className={compact ? 'h-auto w-[180px]' : 'h-auto w-[320px]'}
        style={{ width: 'auto', height: 'auto' }}
      />
    </div>
  )
}
