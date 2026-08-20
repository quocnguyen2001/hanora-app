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
      className={cn('bg-primary-pale animate-pulse rounded-control', className)}
    />
  )
}

/** Skeleton khớp đúng hình dạng một VocabularyCard, để layout không nhảy. */
export function VocabularyCardSkeleton() {
  return (
    <div className="bg-surface shadow-card flex items-center gap-4 rounded-card p-4">
      <Skeleton className="size-12 shrink-0 rounded-control-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  )
}
