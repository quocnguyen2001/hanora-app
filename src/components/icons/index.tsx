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

export const TopicIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
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

/*
 * KHÔNG có `LibraryIcon`.
 *
 * Nó là hai gáy sách dựng cạnh nhau, và ở 22px trong thanh điều hướng thì hai
 * hình chữ nhật bo góc có khe ở giữa đọc thành glyph PAUSE, không đọc thành
 * sách. Tab Kho từ dùng `BookmarkIcon` — vừa khớp showcase, vừa nối được với
 * hành động lưu từ ở `VocabularyCard`, nên "kho từ = chỗ chứa những gì đã đánh
 * dấu" hiện ra ngay mà không cần đọc nhãn.
 */

export const ReviewIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v4h-4" />
  </Icon>
)

export const SettingsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Icon>
)

export const SunIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </Icon>
)

export const MoonIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
  </Icon>
)

/** Nửa sáng nửa tối — lựa chọn "Theo hệ thống". */
export const ContrastIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
  </Icon>
)

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
)

/**
 * Nút quay lại ở các màn chi tiết.
 *
 * Tách khỏi `CloseIcon` vì hai dấu này nói hai chuyện khác nhau trên mobile: ✕
 * là "đóng lớp phủ này lại", ← là "lùi một bậc trong ngăn xếp điều hướng". Ba
 * màn chi tiết (từ, câu, phiên ôn) đều là TRANG thật có URL riêng chứ không
 * phải sheet, nên chúng cần dấu thứ hai — và dấu ← còn khớp hướng của cử chỉ
 * vuốt-để-lùi mà cả iOS lẫn Android đều dùng.
 */
export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m15 5-7 7 7 7" />
  </Icon>
)

export const TextSizeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 7V5h8v2M7 5v14M13 12v-1.5h7V12M16.5 10.5V19" />
  </Icon>
)

/**
 * Ngọn lửa của chuỗi ngày.
 *
 * `filled` phân biệt "đã cháy hôm nay" với "chưa cháy" — theo đúng cách
 * `BookmarkIcon` đã làm cho cùng bài toán hai trạng thái. Chỉ đổi màu là không
 * đủ: người dùng màn hình đơn sắc hoặc khó phân biệt hai tông hồng sẽ không
 * thấy khác biệt nào.
 */
export const FlameIcon = ({ filled = false, ...props }: IconProps & { filled?: boolean }) => (
  <Icon fill={filled ? 'currentColor' : 'none'} {...props}>
    <path d="M12 3c.5 2.5-1 3.5-2.2 4.8A6.4 6.4 0 0 0 8 12a4 4 0 0 0 8 0c0-1.2-.4-2-1-2.8.2 1-.4 1.8-1.1 1.8-.9 0-1.4-.8-1.2-1.9.3-1.7.3-3.4-.7-6.1Z" />
    <path d="M12 21a7 7 0 0 0 7-7c0-3-1.6-5.4-3.2-7" />
    <path d="M12 21a7 7 0 0 1-7-7c0-3 1.6-5.4 3.2-7" />
  </Icon>
)
