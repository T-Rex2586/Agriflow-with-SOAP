import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  loading?: boolean
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  fullWidth = false,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base = [
    'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500',
    'disabled:opacity-50 disabled:pointer-events-none',
    fullWidth ? 'w-full' : '',
  ].join(' ')

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-green-700 text-white hover:bg-green-800 active:scale-[0.98] shadow-md hover:shadow-lg',
    secondary:
      'bg-green-100 text-green-800 hover:bg-green-200 active:scale-[0.98]',
    outline:
      'border-2 border-green-700 text-green-700 hover:bg-green-50 active:scale-[0.98]',
    ghost:
      'text-green-700 hover:bg-green-50 active:scale-[0.98]',
  }

  const sizes: Record<ButtonSize, string> = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span>{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span>{icon}</span>}
        </>
      )}
    </button>
  )
}