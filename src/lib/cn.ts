/**
 * Ghép class có điều kiện.
 *
 * Cố tình KHÔNG dùng `clsx` + `tailwind-merge`: MVP không có component nào cần
 * giải xung đột class Tailwind, và hai package đó là 8KB cho một bài toán chưa
 * tồn tại. Thêm khi có ca thật.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
