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

/**
 * Màu chủ đạo. Thứ tự ở đây là thứ tự hiện trên màn cài đặt.
 *
 * `rose` đứng đầu vì nó là màu thương hiệu và là mặc định — không sắp theo
 * vòng màu, vì cột đầu tiên là chỗ mắt dừng lại và chỗ đó thuộc về mặc định.
 *
 * PRESET, không phải ô chọn màu tự do. Lý do đầy đủ nằm ở khối `TRỤC 4` trong
 * `tokens.css`; tóm tắt: mỗi màu phải cho ra năm giá trị dùng ở năm vai khác
 * nhau × hai chủ đề, và không phép biến đổi tự động nào giữ được tương phản
 * cho cả mười. `scripts/check-contrast.mjs` đo từng preset một.
 */
export const ACCENTS = ['rose', 'tangerine', 'honey', 'mint', 'sky', 'violet'] as const
export const TEXT_TONES = ['ink', 'soft', 'warm', 'high'] as const
export const MOTIONS = ['full', 'reduced'] as const

/**
 * Năm nấc cỡ chữ. Rời rạc chứ không liên tục: thang liên tục cho ra những giá
 * trị như 1.07 mà không ai phân biệt được, và làm bảng đo layout thành vô hạn ca.
 */
export const FONT_SCALES: readonly number[] = [0.9, 1, 1.1, 1.2, 1.3]

export type Theme = (typeof THEMES)[number]
export type FontChoice = (typeof FONTS)[number]
export type AccentChoice = (typeof ACCENTS)[number]
export type TextTone = (typeof TEXT_TONES)[number]
export type MotionChoice = (typeof MOTIONS)[number]

export interface DisplaySettings {
  theme: Theme
  accent: AccentChoice
  font: FontChoice
  fontScale: number
  textTone: TextTone
  motion: MotionChoice
}

export const DEFAULT_DISPLAY: DisplaySettings = {
  theme: 'system',
  accent: 'rose',
  font: 'inter',
  fontScale: 1,
  textTone: 'ink',
  motion: 'full',
}

/**
 * Nhãn tiếng Việt + mã màu để VẼ chính ô chọn màu.
 *
 * Ô chọn phải tô bằng màu nó đại diện, và màu đó KHÔNG lấy được từ token: token
 * `--color-primary` luôn là màu đang bật, nên sáu ô sẽ cùng một màu. Đây là
 * ngoại lệ có lý do với luật "không hex trong component" — cùng ngoại lệ mà nút
 * chọn font đang dùng khi tự render bằng chính font nó đại diện.
 *
 * `swatch` là giá trị BẢNG SÁNG, `swatchDark` là bảng tối. Ô chọn hiển thị theo
 * chủ đề đang bật, nếu không thì ở chế độ tối người dùng chọn một chấm hồng đậm
 * rồi nhận về một app hồng nhạt.
 *
 * ⚠ Phải khớp với khối `TRỤC 4` trong `tokens.css`. Lệch thì ô chọn nói dối.
 */
export const ACCENT_META: Record<
  AccentChoice,
  { label: string; swatch: string; swatchDark: string }
> = {
  rose: { label: 'Hồng anh đào', swatch: '#ff6f91', swatchDark: '#ff92ac' },
  tangerine: { label: 'Cam nắng', swatch: '#f97a3d', swatchDark: '#ffa877' },
  honey: { label: 'Vàng mật', swatch: '#c9880e', swatchDark: '#f6c463' },
  mint: { label: 'Xanh bạc hà', swatch: '#14a06e', swatchDark: '#63dcaa' },
  sky: { label: 'Xanh biển', swatch: '#2f83e0', swatchDark: '#7cc0ff' },
  violet: { label: 'Tím oải hương', swatch: '#8257e6', swatchDark: '#bda0ff' },
}

/**
 * Màu thanh trạng thái của PWA.
 *
 * Phải đổi theo chủ đề. Giữ màu chủ đạo khi app đang ở chế độ tối thì trên
 * Android thanh trạng thái sáng rực nằm ngay trên một màn hình tối — trông như
 * app chưa tải xong.
 *
 * Ở chế độ SÁNG thì nó theo màu chủ đạo: thanh trạng thái là phần app tràn ra
 * ngoài khung, để nó hồng trong khi cả app đang xanh là để lộ đúng chỗ nối.
 * Chế độ tối dùng một màu nền duy nhất cho mọi màu chủ đạo — nền tối không đổi
 * theo trục này.
 */
const DARK_THEME_COLOR = '#16131A'

export function themeColor(resolved: 'light' | 'dark', accent: AccentChoice): string {
  return resolved === 'dark' ? DARK_THEME_COLOR : ACCENT_META[accent].swatch
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
  root.dataset.accent = settings.accent
  root.dataset.font = settings.font
  root.dataset.textTone = settings.textTone
  root.dataset.motion = settings.motion
  root.style.setProperty('--font-scale', String(settings.fontScale))

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', themeColor(resolved, settings.accent))
}
