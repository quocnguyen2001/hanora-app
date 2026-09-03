import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import type { Topic } from '../api'

/**
 * Một thẻ chủ đề trên lưới.
 *
 * Thanh tiến độ dựng bằng HAI div và một `%`, không thư viện — cùng lập luận
 * chi phí mà `MainNavigation` đã ghi khi từ chối kéo `motion` vào bundle
 * chính cho một hiệu ứng trượt.
 */
export function TopicCard({ topic, onDelete }: { topic: Topic; onDelete?: () => void }) {
  /*
   * Hai trạng thái riêng cho chủ đề TỰ TẠO, đặt TRƯỚC nhánh thường.
   *
   * Không tách ra thì thẻ đang sinh trông y hệt một chủ đề rỗng `0/0` bấm vào
   * là màn "đã học hết" — người dùng vừa tạo xong lại tưởng nó hỏng.
   */
  if (topic.status === 'generating') {
    return (
      <Card className="h-full">
        <div className="flex h-full flex-col gap-2" aria-busy>
          <span aria-hidden className="text-[1.75rem] leading-none opacity-50">
            {topic.emoji}
          </span>
          <span className="text-body text-text-primary font-medium">{topic.name}</span>
          <span className="text-caption text-text-secondary mt-auto">Đang tìm từ…</span>
          <div className="bg-border h-2.5 w-full overflow-hidden rounded-full">
            <div className="bg-primary h-full w-1/3 animate-pulse rounded-full" />
          </div>
        </div>
      </Card>
    )
  }

  if (topic.status === 'failed') {
    return (
      <Card className="h-full">
        <div className="flex h-full flex-col gap-2">
          <span aria-hidden className="text-[1.75rem] leading-none opacity-50">
            {topic.emoji}
          </span>
          <span className="text-body text-text-primary font-medium">{topic.name}</span>
          <span className="text-caption text-error mt-auto">
            {topic.failed_reason === 'rate_limited'
              ? 'Hệ thống đang bận. Xoá rồi thử lại sau nhé.'
              : 'Không tìm được từ cho chủ đề này.'}
          </span>
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              Xoá
            </Button>
          )}
        </div>
      </Card>
    )
  }

  const total = topic.word_count
  /*
   * `processed_count`, KHÔNG phải `learned + skipped`.
   *
   * Một từ có thể vừa được lưu vừa bị bỏ qua, nên cộng hai bộ đếm sẽ cho `80/78`
   * và thanh tiến độ tràn. API đã tính DISTINCT sẵn.
   */
  const done = Math.min(topic.processed_count, total)
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const finished = total > 0 && done >= total

  return (
    <Card interactive className="hover:bg-primary-pale h-full">
      {/* Cả thẻ bấm được, nhưng chỉ MỘT phần tử là link — trình đọc màn hình
          không nên gặp hai đích cho cùng một ô. */}
      <Link
        to={`/topics/${topic.slug}`}
        className="rounded-control-lg focus-visible:outline-primary flex h-full flex-col gap-2 focus-visible:outline-2"
      >
        <span aria-hidden className="text-[1.75rem] leading-none">
          {topic.emoji}
        </span>

        <span className="text-section text-text-primary">{topic.name}</span>

        {/* Chủ đề đã học hết VẪN bấm được — vào trong sẽ gặp màn "đã học hết"
            có lời giải thích, chứ không phải một thẻ chết im lặng. */}
        <span className="text-caption text-text-secondary mt-auto flex items-center gap-1">
          {finished && <span aria-hidden>✓</span>}
          {done}/{total}
          <span className="sr-only">
            {finished ? ' — đã học hết chủ đề này' : ` từ đã học trên tổng số ${total}`}
          </span>
        </span>

        <div aria-hidden className="bg-border h-2.5 w-full overflow-hidden rounded-full">
          <div
            className={cn('h-full rounded-full', finished ? 'bg-success' : 'bg-primary')}
            style={{ width: `${percent}%` }}
          />
        </div>
      </Link>
    </Card>
  )
}
