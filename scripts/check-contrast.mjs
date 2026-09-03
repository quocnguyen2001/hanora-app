/**
 * Đo tương phản WCAG cho mọi tổ hợp {tông chữ} × {chủ đề}.
 *
 * Màu được PARSE THẲNG từ `src/styles/tokens.css`. Không chép tay giá trị vào
 * đây — chép tay là cách chắc chắn nhất để đo một bảng màu không tồn tại, và
 * bảng đo sẽ vẫn xanh sau khi ai đó sửa token.
 *
 *   node scripts/check-contrast.mjs
 *
 * Thoát với mã 1 nếu có cặp nào trượt ngưỡng, để dùng được trong CI.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8')

/** Lấy các cặp `--token: #hex` trong một khối `selector { … }`. */
function readBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(css)

  if (!match) throw new Error(`Không tìm thấy khối: ${selector}`)

  const colors = {}

  for (const [, name, hex] of match[1].matchAll(/(--color-[\w-]+):\s*(#[0-9a-fA-F]{3,8})/g)) {
    colors[name] = hex
  }

  return colors
}

const light = readBlock('@theme')
const dark = { ...light, ...readBlock(":root[data-theme='dark']") }

const TONES = ['ink', 'soft', 'warm', 'high']

/** Phải khớp `ACCENTS` trong `src/lib/display-theme.ts`. */
const ACCENTS = ['rose', 'tangerine', 'honey', 'mint', 'sky', 'violet']

function toneColors(tone, theme) {
  const base = theme === 'dark' ? dark : light
  const selector =
    theme === 'dark'
      ? `:root[data-theme='dark'][data-text-tone='${tone}']`
      : `:root[data-text-tone='${tone}']`

  return { ...base, ...readBlock(selector) }
}

function accentColors(accent, theme) {
  const base = theme === 'dark' ? dark : light
  const selector =
    theme === 'dark'
      ? `:root[data-theme='dark'][data-accent='${accent}']`
      : `:root[data-accent='${accent}']`

  return { ...base, ...readBlock(selector) }
}

/** sRGB → luminance tương đối, theo WCAG 2.1 §relative luminance. */
function luminance(hex) {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value

  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function ratio(foreground, background) {
  const a = luminance(foreground)
  const b = luminance(background)
  const [light_, dark_] = a > b ? [a, b] : [b, a]

  return (light_ + 0.05) / (dark_ + 0.05)
}

/**
 * Chữ lớn (≥ 24px hoặc ≥ 18.66px in đậm) chỉ cần 3:1 theo WCAG AA.
 * Chữ Hán hero là 48px, tiêu đề 24px — cả hai thuộc nhóm này.
 *
 * HAI TẦNG, và sự phân biệt này quan trọng:
 *
 *   `tone`  — do tính năng tông chữ sinh ra. Thuộc phạm vi, PHẢI đạt, chặn CI.
 *   `semantic` — đúng/sai/cảnh báo. Không đổi theo tông cũng không đổi theo màu
 *             chủ đạo, nên đo một lần mỗi chủ đề. BÁO, không chặn, cùng lý do
 *             với `brand`: chúng chốt trong bảng màu thương hiệu.
 *   `ui`    — cặp màu do một quyết định giao diện sinh ra sau này (đĩa dấu
 *             đúng/sai). Cũng PHẢI đạt và cũng chặn CI, tách khỏi `tone` chỉ vì
 *             nó không đổi theo tông chữ nên không cần đọc lại bốn lần.
 *   `brand` — họ màu primary, đo lại cho TỪNG màu chủ đạo × chủ đề.
 *             Hồng #ff6f91 trên nền trắng chỉ đạt 2,65:1, và nó đã như thế từ
 *             trước khi có trục màu chủ đạo. Sửa nghĩa là đổi màu thương hiệu —
 *             quyết định của người dùng, không phải của script. Nên: BÁO, không
 *             chặn. Năm màu thêm vào sau được cân để đạt HOẶC vượt mức của hồng
 *             mặc định; bảng dưới là chỗ kiểm chứng điều đó, không phải chỗ giấu.
 *
 * Đừng "sửa" bằng cách hạ ngưỡng nhóm `brand` xuống cho xanh. Con số phải nói
 * thật, và ai đó cần nhìn thấy nó để quyết định.
 */
const CHECKS = [
  {
    scope: 'tone',
    label: 'text-primary / background',
    fg: '--color-text-primary',
    bg: '--color-background',
    min: 4.5,
  },
  {
    scope: 'tone',
    label: 'text-primary / surface',
    fg: '--color-text-primary',
    bg: '--color-surface',
    min: 4.5,
  },
  {
    scope: 'tone',
    label: 'text-secondary / background',
    fg: '--color-text-secondary',
    bg: '--color-background',
    min: 4.5,
  },
  {
    scope: 'tone',
    label: 'text-secondary / surface',
    fg: '--color-text-secondary',
    bg: '--color-surface',
    min: 4.5,
  },
  {
    scope: 'brand',
    label: 'primary / surface',
    fg: '--color-primary',
    bg: '--color-surface',
    min: 4.5,
  },
  {
    scope: 'brand',
    label: 'primary / primary-soft',
    fg: '--color-primary',
    bg: '--color-primary-soft',
    min: 4.5,
  },
  {
    scope: 'brand',
    label: 'on-primary / primary (nút)',
    fg: '--color-on-primary',
    bg: '--color-primary',
    min: 4.5,
  },
  {
    scope: 'semantic',
    label: 'error / surface',
    fg: '--color-error',
    bg: '--color-surface',
    min: 4.5,
  },
  {
    scope: 'semantic',
    label: 'success / surface',
    fg: '--color-success',
    bg: '--color-surface',
    min: 3,
  },
  /*
   * Đĩa tròn mang dấu ✓/✕ trong khối phản hồi ôn tập.
   *
   * 3:1 chứ không 4.5:1 vì đây là ĐỒ HOẠ mang nghĩa, không phải chữ — WCAG
   * 1.4.11. Và nó thật sự mang nghĩa: với người không phân biệt được đỏ–lục thì
   * hình dạng check/x là thứ duy nhất nói kết quả đúng hay sai.
   *
   * Xếp `ui` chứ không `brand`: hai màu này KHÔNG nằm trong `brand.md`, chúng
   * do lần dựng giao diện này sinh ra. Nợ có sẵn thì cảnh báo, nợ mình vừa tạo
   * thì phải trả.
   */
  {
    scope: 'ui',
    label: 'dấu ✓ / đĩa success',
    fg: '--color-surface',
    bg: '--color-success-solid',
    min: 3,
  },
  {
    scope: 'ui',
    label: 'dấu ✕ / đĩa error',
    fg: '--color-surface',
    bg: '--color-error-solid',
    min: 3,
  },
]

let blockingFailures = 0
const brandFailures = new Map()

/**
 * Một vòng đo. `mark` quyết định theo scope: `brand` chỉ cảnh báo, còn lại chặn.
 *
 * Trả về các dòng đã định dạng thay vì tự in, để chỗ gọi đặt tiêu đề khối.
 */
function measure(colors, checks, heading) {
  const rows = []

  for (const check of checks) {
    const value = ratio(colors[check.fg], colors[check.bg])
    const pass = value >= check.min
    let mark = 'PASS'

    if (!pass && check.scope !== 'brand' && check.scope !== 'semantic') {
      blockingFailures += 1
      mark = 'FAIL'
    } else if (!pass) {
      brandFailures.set(`${heading} · ${check.label}`, value)
      mark = 'WARN'
    }

    rows.push(`  ${mark}  ${value.toFixed(2).padStart(5)}:1  (cần ${check.min})  ${check.label}`)
  }

  console.log(`\n${heading}`)
  console.log(rows.join('\n'))
}

const TONE_CHECKS = CHECKS.filter((check) => check.scope === 'tone')
const UI_CHECKS = CHECKS.filter((check) => check.scope === 'ui')
const BRAND_CHECKS = CHECKS.filter((check) => check.scope === 'brand')
const SEMANTIC_CHECKS = CHECKS.filter((check) => check.scope === 'semantic')

/*
 * BA vòng tách rời, không phải một vòng lồng nhau.
 *
 * Trước đây cả ba scope chạy chung trong vòng tông, và `ui` phải tự lọc bằng
 * `firstTone` để khỏi in bốn dòng y hệt. Trục màu chủ đạo làm cách đó sập hẳn:
 * `brand` giờ đổi theo MÀU chứ không theo tông, nên chạy nó trong vòng tông sẽ
 * đo đúng một màu (màu đang active của `@theme`) và bỏ sót năm màu còn lại —
 * một bảng xanh nói dối.
 *
 * Mỗi scope chạy đúng trục mà nó phụ thuộc:
 *   tone  × theme  — chữ đổi theo tông
 *   theme          — đĩa phản hồi không đổi theo trục nào khác
 *   accent × theme — họ primary đổi theo màu chủ đạo
 */
for (const theme of ['light', 'dark']) {
  const label = theme === 'dark' ? 'TỐI ' : 'SÁNG'

  for (const tone of TONES) {
    measure(toneColors(tone, theme), TONE_CHECKS, `${label} · tông ${tone}`)
  }

  measure(theme === 'dark' ? dark : light, UI_CHECKS, `${label} · đĩa phản hồi`)

  /*
   * Đúng/sai KHÔNG đổi theo màu chủ đạo — người dùng chọn xanh biển thì phản
   * hồi sai vẫn phải đỏ. Đo ở đây, ngoài vòng màu, nếu không bảng cảnh báo lặp
   * cùng hai dòng đó sáu lần và những cặp thật sự đổi bị chìm đi.
   */
  measure(theme === 'dark' ? dark : light, SEMANTIC_CHECKS, `${label} · màu ngữ nghĩa`)

  for (const accent of ACCENTS) {
    measure(accentColors(accent, theme), BRAND_CHECKS, `${label} · màu ${accent}`)
  }
}

if (brandFailures.size > 0) {
  console.log('\n' + '─'.repeat(70))
  console.log('WARN — màu thương hiệu dưới ngưỡng AA (CÓ TỪ TRƯỚC, không chặn):')
  for (const [key, value] of brandFailures) {
    console.log(`  ${value.toFixed(2)}:1  ${key}`)
  }
  console.log('Đổi những màu này là đổi nhận diện thương hiệu — cần người dùng quyết.')
}

const total = (TONE_CHECKS.length * TONES.length + UI_CHECKS.length) * 2

console.log(
  blockingFailures === 0
    ? `\n✓ Cặp bắt buộc: ${total} phép đo, tất cả đạt ngưỡng.`
    : `\n✗ Cặp bắt buộc: ${blockingFailures} cặp trượt ngưỡng.`,
)

process.exit(blockingFailures === 0 ? 0 : 1)
