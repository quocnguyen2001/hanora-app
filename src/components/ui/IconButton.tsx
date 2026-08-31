import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Nút chỉ có icon.
 *
 * `label` là BẮT BUỘC trong type, không phải tùy chọn.
 *
 * Một icon không có tên gọi thì với screen reader nó là một nút trống — người
 * dùng nghe thấy "button" và không biết nó làm gì. Đưa ràng buộc này vào type
 * nghĩa là quên nó sẽ gãy lúc biên dịch chứ không lọt tới lúc audit a11y.
 */
export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string
  icon: ReactNode
  variant?: 'ghost' | 'soft' | 'primary'
  size?: 'sm' | 'md'
}

const VARIANTS = {
  ghost: 'text-text-secondary hover:bg-primary-pale active:bg-primary-soft',
  soft: 'bg-primary-soft text-primary hover:bg-primary-pale',
  primary: 'bg-primary text-on-primary hover:bg-primary/90',
} as const

const SIZES = {
  // Cả hai cỡ đều >= 44px: touch target không được nhỏ hơn ngón tay.
  sm: 'size-11',
  md: 'size-12',
} as const

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'sm',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'duration-press ease-soft inline-flex items-center justify-center rounded-full transition active:scale-95',
        'disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
