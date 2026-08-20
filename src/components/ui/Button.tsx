import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90 active:bg-primary/95',
  secondary:
    'bg-primary-soft text-primary hover:bg-primary-pale active:bg-primary-soft border border-border',
  ghost: 'bg-transparent text-text-secondary hover:bg-primary-pale active:bg-primary-soft',
  // Hiếm và tách bạch rõ khỏi hành động chính (`ux-rules.md`).
  destructive: 'bg-transparent text-error hover:bg-error/10 active:bg-error/15',
}

const SIZES: Record<ButtonSize, string> = {
  // min-h-11 = 44px, ngưỡng touch target tối thiểu.
  sm: 'min-h-11 px-3 text-caption gap-1.5',
  md: 'min-h-11 px-4 text-body gap-2',
  lg: 'min-h-12 px-5 text-meaning gap-2',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      // `aria-busy` để screen reader biết đang xử lý; `disabled` một mình chỉ
      // nói "không bấm được", không nói vì sao.
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-control-lg font-medium',
        'transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <svg aria-hidden width={16} height={16} viewBox="0 0 24 24" className="animate-spin">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
        fill="none"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
