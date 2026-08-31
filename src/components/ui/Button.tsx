import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

/*
 * CHIỀU SÂU CHIA BA BẬC, và thứ bậc đó chính là hierarchy hành động.
 *
 *   primary     — gờ dày màu hồng đậm. Đọc ra là "cái nút của màn này".
 *   secondary   — gờ dày màu trung tính. Bấm được, nhưng không giành sự chú ý.
 *   ghost/destructive — PHẲNG HẲN, không gờ.
 *
 * Ghost giữ phẳng là có chủ đích chứ không phải bỏ sót: `ux-rules.md` đòi một
 * hành động chính mỗi màn và các hành động phụ phải "visually quieter". Cho gờ
 * cả ba bậc thì mọi nút cùng nổi lên và không bậc nào còn nghĩa gì.
 *
 * `brightness` thay vì đổi opacity nền: gradient không hoạt động với `bg-primary/90`.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'chunky chunky-primary from-primary to-primary-deep bg-linear-to-b text-on-primary hover:brightness-105',
  secondary:
    'chunky chunky-neutral bg-surface text-primary hover:bg-primary-pale border border-border',
  ghost: 'bg-transparent text-text-secondary hover:bg-primary-pale active:bg-primary-soft',
  // Hiếm và tách bạch rõ khỏi hành động chính (`ux-rules.md`).
  destructive: 'bg-transparent text-error hover:bg-error/10 active:bg-error/15',
}

/** Variant có gờ 3D — chúng tự lo phản hồi chạm bằng cách lún xuống. */
const CHUNKY_VARIANTS = new Set<ButtonVariant>(['primary', 'secondary'])

const SIZES: Record<ButtonSize, string> = {
  // min-h-11 = 44px, ngưỡng touch target tối thiểu.
  sm: 'min-h-11 px-4 text-caption gap-1.5',
  md: 'min-h-11 px-5 text-body gap-2',
  // Nút hành động chính cuối màn. 52px chứ không 48px: đây là nút mà người dùng
  // bấm hàng trăm lần mỗi phiên ôn, và nó phải trúng được mà không cần nhìn.
  lg: 'min-h-13 px-6 text-meaning gap-2',
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
        // `font-bold` chứ không `font-medium`: nhãn nút là chỗ chữ đậm đọc rõ
        // nhất tác dụng, và nó cân với gờ dày bên dưới. Một khối dày 4px mang
        // dòng chữ mảnh trông như cái nút chưa vẽ xong.
        'rounded-control-lg inline-flex items-center justify-center font-bold',
        'duration-press ease-soft transition',
        // Nút PHẲNG không có gờ để lún, nên nó vẫn cần co nhẹ để trả lời chạm.
        !CHUNKY_VARIANTS.has(variant) && 'active:scale-[0.97]',
        // Gờ mờ theo nút chứ không đứng trơ lại: `chunky` chỉ đặt `box-shadow`,
        // và `opacity` trên chính phần tử làm mờ cả gờ lẫn mặt.
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
