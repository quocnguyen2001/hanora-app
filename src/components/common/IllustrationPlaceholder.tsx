import { cn } from '@/lib/cn'

/**
 * Khung ảnh minh họa trung tính.
 *
 * MVP không có ảnh (D2). Placeholder này giữ ĐÚNG TỈ LỆ chỗ dành cho ảnh, để
 * khi có ảnh thật thì layout không vỡ và không ai phải đo lại spacing.
 *
 * Không phải hạ tầng đầu cơ: `ux-rules.md` và bản thiết kế đều yêu cầu chỗ này
 * có mặt trong MVP.
 */
export function IllustrationPlaceholder({
  className,
  ratio = 'square',
}: {
  className?: string
  ratio?: 'square' | 'wide'
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'bg-primary-pale flex items-center justify-center rounded-[--radius-card-lg]',
        ratio === 'square' ? 'aspect-square' : 'aspect-[16/9]',
        className,
      )}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-primary/30">
        <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="10" r="1.5" fill="currentColor" />
        <path
          d="m5 17 4.5-4.5L13 16l3-2.5L19 17"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
