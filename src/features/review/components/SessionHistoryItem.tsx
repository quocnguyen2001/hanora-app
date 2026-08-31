import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import type { ReviewGrade, ReviewSessionMeta } from '../api'

const MODE_LABELS = { mcq: 'Trắc nghiệm', typing: 'Gõ lại' } as const

const GRADE_LABELS: Record<ReviewGrade, { label: string; className: string }> = {
  excellent: { label: 'Xuất sắc', className: 'text-success' },
  good: { label: 'Giỏi', className: 'text-success' },
  fair: { label: 'Khá', className: 'text-text-secondary' },
  needs_work: { label: 'Cần ôn thêm', className: 'text-text-secondary' },
}

function formatStartedAt(iso: string): string {
  const date = new Date(iso)

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null

  // Phòng thân trước một bản ghi cũ lệch dấu: người dùng không bao giờ được
  // thấy "-8 phút".
  const safe = Math.max(0, seconds)

  return safe < 60 ? `${safe} giây` : `${Math.round(safe / 60)} phút`
}

/**
 * Một dòng phiên trong danh sách lịch sử.
 *
 * Dùng ở cả trang Lịch sử lẫn mục "Phiên gần đây" của trang Thống kê — một
 * component, nên hai chỗ không trôi khỏi nhau.
 */
export function SessionHistoryItem({
  session,
  onSelect,
}: {
  session: ReviewSessionMeta
  onSelect: () => void
}) {
  const grade = session.grade ? GRADE_LABELS[session.grade] : null
  const duration = formatDuration(session.duration_seconds)

  return (
    <button type="button" onClick={onSelect} className="w-full text-left">
      <Card interactive className="hover:bg-primary-pale">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption text-text-secondary">
              {formatStartedAt(session.started_at)}
            </span>
            <Badge>{MODE_LABELS[session.mode]}</Badge>
            {/* Nhãn nguồn CHỈ hiện với phiên ôn từ hay sai: phiên theo lịch là
                mặc định, gắn nhãn cho nó chỉ thêm nhiễu. */}
            {session.source === 'weak' && <Badge>Từ hay sai</Badge>}
          </div>

          <div className="text-right">
            <p className="text-stat text-text-primary leading-none">{session.score ?? 0}</p>
            {grade && <p className={cn('text-caption mt-1', grade.className)}>{grade.label}</p>}
          </div>
        </div>

        <p className="text-body text-text-secondary mt-2">
          Đúng {session.correct_count}/{session.answered_count}
          {duration && ` · ${duration}`}
        </p>
      </Card>
    </button>
  )
}
