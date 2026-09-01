import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  leadingIcon?: ReactNode
  trailingSlot?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leadingIcon, trailingSlot, className, id, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`
  const message = error ?? hint

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="text-body text-text-primary mb-1.5 block font-medium">
          {label}
        </label>
      )}

      <div
        className={cn(
          'bg-surface rounded-control-lg flex items-center gap-2 border px-3',
          'focus-within:border-primary transition-colors duration-150',
          error ? 'border-error' : 'border-border',
        )}
      >
        {leadingIcon && <span className="text-text-secondary shrink-0">{leadingIcon}</span>}

        <input
          ref={ref}
          id={inputId}
          // Nối input với thông báo lỗi: hiện lỗi bằng màu đỏ mà không nối
          // aria thì screen reader không bao giờ đọc được nó.
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          // KHÔNG đặt utility `text-body` ở đây. Cỡ chữ ô nhập do `@layer base`
          // trong `app.css` quyết định, vì nó phải có sàn 16px trên thiết bị
          // cảm ứng để iOS không phóng to cả trang lúc focus. Utility nằm ở
          // layer sau base nên sẽ đè mất cái sàn đó; kế thừa từ `body` cho ra
          // đúng 14px trên desktop mà vẫn để quy tắc cảm ứng thắng.
          className={cn(
            'text-text-primary min-h-11 w-full bg-transparent outline-none',
            'placeholder:text-text-secondary',
            className,
          )}
          {...props}
        />

        {trailingSlot && <span className="shrink-0">{trailingSlot}</span>}
      </div>

      {message && (
        <p
          id={messageId}
          // `role="alert"` chỉ cho lỗi: gợi ý tĩnh mà cũng ngắt lời screen
          // reader là gây phiền, không phải giúp đỡ.
          role={error ? 'alert' : undefined}
          className={cn('text-caption mt-1.5', error ? 'text-error' : 'text-text-secondary')}
        >
          {message}
        </p>
      )}
    </div>
  )
})
