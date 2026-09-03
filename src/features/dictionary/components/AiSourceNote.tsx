import { cn } from '@/lib/cn'

/**
 * Nhãn nguồn cho nội dung do AI sinh.
 *
 * MỘT lần cho mỗi KHỐI, không phải mỗi mục — ba nhãn giống hệt nhau trong một
 * thẻ là nhiễu, và người đọc bỏ qua cả ba.
 *
 * Nhưng nó phải có mặt ở từng khối chứ không một lần cho cả trang: nội dung AI
 * nằm xen giữa nội dung có nguồn thật (Tatoeba, CC-CEDICT, Unihan), nên một
 * nhãn duy nhất ở đầu trang sẽ đọc ra như thể cả trang do AI sinh.
 *
 * Tách khỏi `WordDetailPage` khi khối thứ hai cần nó ở một file khác — trước đó
 * nó là hàm cục bộ trong trang, và cả bốn chỗ dùng đều ở đó.
 */
export function AiSourceNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-caption text-text-secondary mt-1', className)}>
      Nội dung do AI sinh, chưa có người rà.
    </p>
  )
}
