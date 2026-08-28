import { cn } from '@/lib/cn'

/**
 * Khung xương chờ dữ liệu.
 *
 * `ux-rules.md`: ưu tiên skeleton hơn spinner chặn màn. Spinner nói "đang chờ";
 * skeleton nói "sắp có gì ở đây", và giữ layout khỏi nhảy khi dữ liệu về.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      // `aria-hidden`: screen reader không cần nghe mô tả một hình chữ nhật xám.
      // Trạng thái tải thông báo ở vùng bọc ngoài bằng `aria-busy`.
      aria-hidden
      /*
       * `bg-skeleton`, KHÔNG phải `bg-primary-pale`. Token cũ đạt 1.05:1 so với
       * `--color-surface` — tức khung xương trên thẻ trắng thực tế vô hình, và
       * `animate-pulse` hạ opacity xuống 0.5 nửa chu kỳ còn làm tệ thêm. Xem
       * khối ghi chú ở `--color-skeleton` trong `tokens.css`.
       *
       * `animate-skeleton`, KHÔNG phải `animate-pulse`. `pulse` là mặc định của
       * Tailwind: 2s, `cubic-bezier(.4,0,.6,1)`, biên độ tới 0.5 — không đi qua
       * token nào của design system nên không sửa được từ một chỗ.
       */
      className={cn('bg-skeleton animate-skeleton rounded-control', className)}
    />
  )
}

/** Skeleton khớp đúng hình dạng một VocabularyCard, để layout không nhảy. */
export function VocabularyCardSkeleton() {
  return (
    <div className="bg-surface shadow-card rounded-card flex items-center gap-4 p-4">
      <Skeleton className="rounded-control-lg size-12 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  )
}
