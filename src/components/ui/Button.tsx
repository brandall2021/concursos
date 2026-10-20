import { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-face-red text-white shadow-sm hover:bg-red-700',
  secondary: 'border border-gray-200 bg-white text-gray-800 shadow-sm hover:border-gray-300 hover:bg-gray-50',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function buttonClassName(variant: ButtonVariant = 'primary', className = '') {
  return `inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-face-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`
}

export function Button({ variant = 'primary', className = '', children, ...props }: Props) {
  return (
    <button
      className={buttonClassName(variant, className)}
      {...props}
    >
      {children}
    </button>
  )
}
