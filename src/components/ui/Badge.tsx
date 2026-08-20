import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'primary' | 'neutral' | 'success' | 'warning'

const TONES: Record<BadgeTone, string> = {
  primary: 'bg-primary-soft text-primary',
  neutral: 'bg-primary-pale text-text-secondary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/15 text-warning',
}

/** Nhãn nhỏ: "HSK 1", "A1", "Hôm qua". Nền mềm, không viền. */
export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'text-caption inline-flex items-center rounded-full px-2.5 py-1 font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
