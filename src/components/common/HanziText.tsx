import { cn } from '@/lib/cn'

/**
 * Chữ Hán. LUÔN giữ hierarchy mạnh nhất trên mọi màn từ vựng (ràng buộc thiết kế).
 *
 * Có component riêng vì chữ Hán cần font stack khác hẳn phần còn lại, và vì
 * `lang="zh-Hans"` giúp trình duyệt chọn đúng glyph — cùng một codepoint được
 * vẽ khác nhau giữa tiếng Trung, Nhật và Hàn.
 */
export function HanziText({
  children,
  size = 'hero',
  className,
}: {
  children: string
  size?: 'hero' | 'title' | 'inline'
  className?: string
}) {
  /*
   * Cả ba cỡ đều đi qua thang token, không cỡ nào là giá trị thô.
   *
   * `title` từng là `text-[1.75rem] leading-[2.25rem] font-medium`. Giá trị viết
   * thẳng như thế nằm ngoài thang nên KHÔNG nhân với `--font-scale`: người dùng
   * chọn cỡ chữ lớn thì mọi thứ to lên trừ chữ Hán — đúng thứ họ cần nhìn rõ
   * nhất, và cũng là thứ `components.md` bắt phải giữ hierarchy mạnh nhất.
   */
  const sizes = {
    hero: 'text-hanzi-hero',
    title: 'text-hanzi-title',
    inline: 'text-meaning',
  } as const

  return (
    <span lang="zh-Hans" className={cn('font-hanzi text-text-primary', sizes[size], className)}>
      {children}
    </span>
  )
}
