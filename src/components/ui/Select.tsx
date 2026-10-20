import { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, error, id, options, placeholder, ...props }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
        {label}
      </label>
      <select
        id={inputId}
        className={`min-h-10 rounded-md border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-face-red focus:ring-2 focus:ring-red-100 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
