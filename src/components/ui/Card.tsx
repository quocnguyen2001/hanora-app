import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Bề mặt lớn hơn dùng bo góc lớn hơn. */
  size?: 'default' | 'hero'
}

/**
 * Bề mặt cơ bản. Viền gánh phần lớn việc phân tách, bóng đổ chỉ rất nhẹ —
 * card nổi đổ bóng nặng phá cảm giác "calm" mà ux-rules đặt làm nguyên tắc gốc.
 */
export function Card({ children, size = 'default', className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'border-border bg-surface shadow-card border',
        size === 'hero' ? 'rounded-[--radius-hero] p-6' : 'rounded-[--radius-card] p-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
