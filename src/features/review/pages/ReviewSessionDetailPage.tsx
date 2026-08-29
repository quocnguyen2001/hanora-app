import { useNavigate, useParams } from 'react-router'
import { CloseIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { ReviewHistorySkeleton } from '@/components/ui/PageSkeleton'
import { SessionAnswerList } from '../components/SessionAnswerList'
import { SessionScoreCard } from '../components/SessionScoreCard'
import { averageDurationMs, formatDuration } from '../duration'
import { useSessionDetail } from '../hooks'

export function ReviewSessionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  /*
   * `Number.isInteger` chứ không `Number(id)` trần: `/review/history/abc` cho
   * `NaN`, và `NaN` vừa serialize thành `null` trong query key vừa sinh ra một
   * request tới `/reviews/sessions/NaN`.
   */
  const sessionId = Number(id)
  const valid = Number.isInteger(sessionId) && sessionId > 0

  const detail = useSessionDetail(valid ? sessionId : 0, valid)

  if (!valid) {
    return (
      <EmptyState
        title="Không tìm thấy phiên ôn này."
        description="Đường dẫn không hợp lệ."
        action={<Button onClick={() => void navigate('/review/history')}>Về lịch sử</Button>}
      />
    )
  }

  if (detail.isPending) {
    return (
      <div aria-busy className="space-y-4">
        <ReviewHistorySkeleton />
      </div>
    )
  }

  if (detail.isError) {
    return (
      <EmptyState
        title="Không tìm thấy phiên ôn này."
        description="Có thể nó đã bị xoá, hoặc đường dẫn không đúng."
        action={<Button onClick={() => void navigate('/review/history')}>Về lịch sử</Button>}
      />
    )
  }

  const { session, answers } = detail.data
  const averageMs = averageDurationMs(answers)

  return (
    <div className="animate-rise space-y-4">
      {/* Nút quay lại như mọi màn chi tiết khác — nếu không, lối ra duy nhất là
          nút back của trình duyệt: tab "Ôn tập" đưa về `/review`, không về
          danh sách. */}
      <div className="flex items-center justify-between">
        <IconButton
          label="Quay lại lịch sử"
          icon={<CloseIcon size={20} />}
          onClick={() => void navigate('/review/history')}
        />
      </div>

      <SessionScoreCard
        score={session.score}
        grade={session.grade}
        correct={session.correct_count}
        total={session.answered_count}
        durationSeconds={session.duration_seconds}
        averageMs={averageMs}
      />

      <Card>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-section">Chi tiết {answers.length} lượt</h2>
          {averageMs !== null && (
            <span className="text-caption text-text-secondary">
              trung bình {formatDuration(averageMs)}/thẻ
            </span>
          )}
        </div>

        <div className="mt-3">
          {/* Cùng component với màn tổng kết ngay sau khi ôn — hai màn đọc cùng
              payload, nên chúng không được phép kể hai câu chuyện khác nhau. */}
          <SessionAnswerList
            answers={answers}
            onSelectWord={(wordId) => void navigate(`/words/${wordId}`)}
          />
        </div>
      </Card>
    </div>
  )
}
