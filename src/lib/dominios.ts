export function dominiosPermitidos(): string[] {
  return (process.env.AUTH_ALLOWED_DOMAINS ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
}

// unt.edu.ar es la raíz institucional: las cuentas cuelgan de subdominios (face.unt.edu.ar).
export function dominioPermitido(email: string): boolean {
  const permitidos = dominiosPermitidos()
  if (permitidos.length === 0) return true

  const dominio = email.split('@')[1]?.toLowerCase().trim() ?? ''
  if (!dominio) return false

  return permitidos.some((p) => dominio === p || dominio.endsWith(`.${p}`))
}
