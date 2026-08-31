import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'primary' | 'neutral' | 'success' | 'warning'

const TONES: Record<BadgeTone, string> = {
  primary: 'bg-primary-soft text-primary',
  neutral: 'bg-primary-pale text-text-secondary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/15 text-warning',
}

/**
 * Nhãn nhỏ: "HSK 1", "A1", "Hôm qua". Nền mềm, không viền.
 *
 * `font-bold` và nền đậm hơn một bậc so với bản trước: badge nằm cạnh chữ Hán
 * cỡ lớn và chữ nghĩa in đậm, nên ở nét `medium` nó chìm hẳn xuống thành chữ
 * chú thích. Đây là nhãn mang thông tin (cấp HSK, số lần sai), không phải chữ
 * ký cuối thẻ.
 */
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
        'text-caption inline-flex items-center rounded-full px-2.5 py-1 font-bold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
