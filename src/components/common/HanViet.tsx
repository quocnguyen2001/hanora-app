import { cn } from '@/lib/cn'

/**
 * Âm Hán-Việt — dòng thứ ba.
 *
 * Trả `null` khi không có âm. FE ẩn HẲN dòng này chứ không hiện chuỗi rỗng:
 * một dòng trống trông như lỗi giao diện, và bịa âm thì tệ hơn nữa vì người học
 * sẽ nhớ cái sai (R1/R6).
 *
 * Âm Hán-Việt KHÔNG BAO GIỜ thay thế định nghĩa tiếng Anh — với từ khẩu ngữ như
 * `东西` (`đông tây`, nghĩa là "thứ, đồ vật") âm đọc không phải nghĩa. Hai thứ
 * luôn hiển thị cùng nhau; xem `WordDetailHero`.
 */
export function HanViet({ children, className }: { children: string | null; className?: string }) {
  if (!children) return null

  return (
    <span lang="vi" className={cn('text-meaning text-text-primary', className)}>
      {children}
    </span>
  )
}
