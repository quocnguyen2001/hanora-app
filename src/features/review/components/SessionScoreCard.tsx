import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import type { ReviewGrade } from '../api'

/**
 * Nhãn xếp loại nằm ở APP, không ở server.
 *
 * Server trả MÃ (`excellent`…) chứ không trả chữ hiển thị: đó là quyết định về
 * ranh giới — chữ tiếng Việt đổi được mà không phải deploy API.
 */
const GRADE_LABELS: Record<ReviewGrade, { label: string; className: string }> = {
  excellent: { label: 'Xuất sắc', className: 'text-success' },
  good: { label: 'Giỏi', className: 'text-success' },
  fair: { label: 'Khá', className: 'text-text-secondary' },
  needs_work: { label: 'Cần ôn thêm', className: 'text-text-secondary' },
}

function formatDuration(seconds: number): string {
  // `Math.max(0, …)` phòng thân: server đã tính đúng chiều, nhưng một bản ghi
  // cũ lệch dấu không được phép hiện "-8 phút" cho người dùng.
  const safe = Math.max(0, seconds)

  if (safe < 60) return `${safe} giây`

  return `${Math.round(safe / 60)} phút`
}

/**
 * Khối điểm + xếp loại của một phiên.
 *
 * Dùng ở màn tổng kết ngay sau khi ôn và ở trang chi tiết phiên trong lịch sử —
 * một component, nên hai chỗ không thể hiện hai con số khác nhau.
 */
export function SessionScoreCard({
  score,
  grade,
  correct,
  total,
  durationSeconds,
  averageMs,
  className,
}: {
  score: number | null
  grade: ReviewGrade | null
  correct: number
  total: number
  durationSeconds?: number | null
  /** Thời gian trung bình mỗi thẻ; `null` khi không lượt nào có số đo. */
  averageMs?: number | null
  className?: string
}) {
  const gradeInfo = grade ? GRADE_LABELS[grade] : null

  return (
    <Card size="hero" className={cn('text-center', className)}>
      <p className="text-section text-text-secondary">Xong phiên ôn</p>

      <p className="text-primary text-score mt-2">{score ?? 0}</p>

      {/* Xếp loại ẩn HẲN khi phiên không có lượt nào tính điểm — nó không có
          xếp loại, chứ không phải xếp loại kém. */}
      {gradeInfo && (
        <p className={cn('text-section mt-1', gradeInfo.className)}>{gradeInfo.label}</p>
      )}

      <p className="text-body text-text-secondary mt-2">
        Đúng {correct}/{total}
        {typeof durationSeconds === 'number' && ` · ${formatDuration(durationSeconds)}`}
      </p>

      {typeof averageMs === 'number' && (
        <p className="text-caption text-text-secondary mt-1">
          Trung bình {(averageMs / 1000).toFixed(1)}s mỗi thẻ
        </p>
      )}
    </Card>
  )
}
