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
        'bg-surface shadow-card',
        size === 'hero' ? 'rounded-hero p-6' : 'rounded-card p-4',
        // Chỉ thẻ bấm được mới lún xuống khi chạm. Thẻ tĩnh mà phản hồi chạm
        // là nói dối người dùng rằng có gì đó sẽ xảy ra.
        props.onClick && 'transition duration-press ease-soft active:scale-[0.99] cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
