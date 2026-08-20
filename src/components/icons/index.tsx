import type { SVGProps } from 'react'

/**
 * Bộ icon SVG nét mảnh, bo tròn — theo ICON STYLE trong showcase.
 *
 * KHÔNG dùng emoji làm icon UI (ràng buộc của design system). Emoji render khác
 * nhau trên từng hệ điều hành, không đổi màu theo trạng thái, và không có kích
 * thước nét nhất quán.
 *
 * Mọi icon ở đây là icon TRANG TRÍ: `aria-hidden`. Tên gọi cho screen reader
 * phải nằm ở chữ bên cạnh hoặc `aria-label` của nút bọc ngoài — xem `IconButton`.
 *
 * Không có icon camera: tìm bằng ảnh nằm ngoài MVP, và không ship nút chết.
 */
export type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
)

export const BookmarkIcon = ({ filled = false, ...props }: IconProps & { filled?: boolean }) => (
  <Icon {...props}>
    <path
      d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4Z"
      fill={filled ? 'currentColor' : 'none'}
    />
  </Icon>
)

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)

export const ChartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 20V10M12 20V4M19 20v-6" />
  </Icon>
)

export const UserIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Icon>
)

export const SpeakerIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M11 5 6.5 9H4v6h2.5L11 19Z" />
    <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
    <path d="M18 7a7 7 0 0 1 0 10" />
  </Icon>
)

export const PencilIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z" />
    <path d="m15 6 3 3" />
  </Icon>
)

export const StarIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8Z" />
  </Icon>
)

export const HeartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z" />
  </Icon>
)

export const TrashIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16M10 7V5h4v2M6 7l1 13h10l1-13" />
  </Icon>
)

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="6" width="16" height="14" rx="2" />
    <path d="M8 3v4M16 3v4M4 11h16" />
  </Icon>
)

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
)

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const MoreIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
)

export const LibraryIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
    <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14Z" />
  </Icon>
)

export const ReviewIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v4h-4" />
  </Icon>
)
