/**
 * Tùy chỉnh hiển thị — hằng số và việc áp giá trị lên `<html>`.
 *
 * Tách khỏi store vì hai bên dùng nó ở hai thời điểm khác nhau: store gọi khi
 * người dùng đổi lựa chọn, còn script inline trong `index.html` phải áp giá trị
 * TRƯỚC khi bundle này tải xong.
 *
 * ⚠ Script inline trong `index.html` LẶP LẠI logic của `applyDisplay()`. Không
 * dùng chung được — nó chạy trước cả module đầu tiên. Sửa tên thuộc tính hay
 * khóa lưu trữ ở đây thì PHẢI sửa cả bên đó, nếu không chủ đề sẽ nháy một nhịp
 * mỗi lần mở app.
 */

export const STORAGE_KEY = 'hanora.display'

export const THEMES = ['light', 'dark', 'system'] as const
export const FONTS = ['inter', 'lora', 'system'] as const
export const TEXT_TONES = ['ink', 'soft', 'warm', 'high'] as const
export const MOTIONS = ['full', 'reduced'] as const

/**
 * Năm nấc cỡ chữ. Rời rạc chứ không liên tục: thang liên tục cho ra những giá
 * trị như 1.07 mà không ai phân biệt được, và làm bảng đo layout thành vô hạn ca.
 */
export const FONT_SCALES: readonly number[] = [0.9, 1, 1.1, 1.2, 1.3]

export type Theme = (typeof THEMES)[number]
export type FontChoice = (typeof FONTS)[number]
export type TextTone = (typeof TEXT_TONES)[number]
export type MotionChoice = (typeof MOTIONS)[number]

export interface DisplaySettings {
  theme: Theme
  font: FontChoice
  fontScale: number
  textTone: TextTone
  motion: MotionChoice
}

export const DEFAULT_DISPLAY: DisplaySettings = {
  theme: 'system',
  font: 'inter',
  fontScale: 1,
  textTone: 'ink',
  motion: 'full',
}

/**
 * Màu thanh trạng thái của PWA.
 *
 * Phải đổi theo chủ đề. Giữ hồng khi app đang ở chế độ tối thì trên Android
 * thanh trạng thái sáng rực nằm ngay trên một màn hình tối — trông như app
 * chưa tải xong.
 */
export const THEME_COLOR: Record<'light' | 'dark', string> = {
  light: '#FF6F91',
  dark: '#16131A',
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** `system` → giá trị thật. CSS chỉ bao giờ thấy `light` hoặc `dark`. */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme

  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}

  const query = window.matchMedia(DARK_QUERY)

  query.addEventListener('change', onChange)

  return () => query.removeEventListener('change', onChange)
}

/**
 * Áp toàn bộ lựa chọn lên `<html>`.
 *
 * Mọi thứ đi qua thuộc tính `data-*` và một biến CSS — không có class nào bị
 * thêm bớt, và không component nào phải biết chủ đề đang là gì. Đó là lý do
 * codebase không có một class `dark:` nào.
 */
export function applyDisplay(settings: DisplaySettings): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const resolved = resolveTheme(settings.theme)

  root.dataset.theme = resolved
  root.dataset.font = settings.font
  root.dataset.textTone = settings.textTone
  root.dataset.motion = settings.motion
  root.style.setProperty('--font-scale', String(settings.fontScale))

  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolved])
}
