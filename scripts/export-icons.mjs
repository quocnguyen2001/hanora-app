/**
 * Xuất icon PWA từ `src/assets/icon-source.svg`.
 *
 *   node scripts/export-icons.mjs
 *
 * Vì sao script này tồn tại: bốn file PNG trong `public/icons/` trước đây là
 * artifact KHÔNG TÁI LẬP ĐƯỢC — không có script nào sinh ra chúng, nên lần sửa
 * mark tiếp theo sẽ hoặc quên xuất lại, hoặc xuất bằng một cách khác và ra kết
 * quả lệch. Cùng loại rủi ro với đường ống font từng đứt suốt nhiều phase mà
 * không ai biết.
 *
 * `sharp` đã là devDependency, không thêm gì mới. Script chạy tay, không nằm
 * trong build — cùng quy ước với `check-contrast.mjs`.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'src/assets/icon-source.svg')
const OUT_DIR = join(ROOT, 'public/icons')

/*
 * `apple-touch-icon` là 180px theo yêu cầu của iOS.
 *
 * Bản maskable dùng CÙNG một nguồn, không cần nguồn riêng: `icon-source.svg` đã
 * đặt hoa trong vùng an toàn 80% giữa, nên Android cắt tròn hay cắt bo góc đều
 * không phạm vào hình.
 */
const TARGETS = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

const svg = readFileSync(SOURCE)

/*
 * Bỏ comment TRƯỚC khi soi.
 *
 * Comment của `icon-source.svg` giải thích chính lỗi này, nên nó nhắc chuỗi
 * `<text` một cách hợp lệ. Soi cả comment thì guard tự chặn file đúng — đúng
 * loại dương tính giả biến một kiểm tra tốt thành thứ người ta tắt đi.
 */
const markup = svg.toString().replace(/<!--[\s\S]*?-->/g, '')

if (markup.includes('<text')) {
  console.error(
    'icon-source.svg chứa phần tử <text>. Icon PWA phải là path thuần — chữ sẽ\n' +
      'được vẽ bằng font của máy người dùng, nên mỗi thiết bị ra một kiểu.',
  )
  process.exit(1)
}

for (const { file, size } of TARGETS) {
  const png = await sharp(svg, { density: 512 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer()

  writeFileSync(join(OUT_DIR, file), png)
  console.log(`${file.padEnd(24)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} KB`)
}

console.log('\n✓ Xuất xong từ icon-source.svg')
