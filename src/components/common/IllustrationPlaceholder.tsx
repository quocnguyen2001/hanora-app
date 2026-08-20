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
        'from-primary-soft to-primary-pale flex items-center justify-center rounded-card-lg bg-linear-to-br',
        ratio === 'square' ? 'aspect-square' : 'aspect-[16/9]',
        className,
      )}
    >
      {/*
        Hoa anh đào thay cho icon "khung ảnh" chung chung. Chỗ trống vẫn là chỗ
        trống, nhưng mang đúng giọng thương hiệu thay vì trông như ảnh lỗi.
      */}
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="text-primary/35">
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse
            key={angle}
            cx="12"
            cy="7.4"
            rx="2.9"
            ry="4.1"
            fill="currentColor"
            transform={`rotate(${angle} 12 12)`}
          />
        ))}
        <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      </svg>
    </div>
  )
}
