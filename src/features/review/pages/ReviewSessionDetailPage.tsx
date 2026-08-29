import { useNavigate, useParams } from 'react-router'
import { HanziText } from '@/components/common/HanziText'
import { CloseIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { ReviewHistorySkeleton } from '@/components/ui/PageSkeleton'
import { cn } from '@/lib/cn'
import { SessionScoreCard } from '../components/SessionScoreCard'
import type { ReviewAnswer } from '../history-api'
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
      />

      <Card>
        <h2 className="text-section">Từng thẻ</h2>

        <ul className="mt-3 space-y-3">
          {answers.map((answer) => (
            <AnswerRow
              key={answer.id}
              answer={answer}
              onSelect={() => void navigate(`/words/${answer.word.id}`)}
            />
          ))}
        </ul>
      </Card>
    </div>
  )
}

function AnswerRow({ answer, onSelect }: { answer: ReviewAnswer; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-3 text-left',
          /*
           * Lượt LÀM LẠI hiển thị nhạt hơn kèm nhãn.
           *
           * Chúng không tính vào điểm, nên hiện ngang hàng sẽ khiến người dùng
           * tự cộng ra một con số khác với điểm ngay phía trên.
           */
          answer.is_retry && 'opacity-60',
        )}
      >
        {/* `role="img"` để `aria-label` hợp lệ: role ngầm `generic` của `span`
            CẤM đặt tên khả truy cập, và nhãn hiện chỉ lọt ra nhờ thuật toán
            name-from-content của `<button>` cha. */}
        <span
          role="img"
          aria-label={answer.is_correct ? 'Đúng' : 'Sai'}
          className={cn(
            'text-body w-5 shrink-0 text-center',
            answer.is_correct ? 'text-success' : 'text-error',
          )}
        >
          {answer.is_correct ? '✓' : '✕'}
        </span>

        <HanziText size="inline">{answer.word.simplified}</HanziText>

        <span className="text-body text-text-secondary flex-1">
          {answer.word.han_viet ?? answer.word.pinyin}
        </span>

        {/* Đáp án đã gõ chỉ có nghĩa ở mode gõ — ở trắc nghiệm nó là một id. */}
        {answer.mode === 'typing' && answer.answer_raw && !answer.is_correct && (
          <span className="text-caption text-text-secondary line-through">
            {answer.answer_raw}
          </span>
        )}

        {answer.is_retry && <Badge>làm lại</Badge>}
      </button>
    </li>
  )
}
