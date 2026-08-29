import { useNavigate, useParams } from 'react-router'
import { HanziText } from '@/components/common/HanziText'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ReviewHistorySkeleton } from '@/components/ui/PageSkeleton'
import { cn } from '@/lib/cn'
import { SessionScoreCard } from '../components/SessionScoreCard'
import type { ReviewAnswer } from '../history-api'
import { useSessionDetail } from '../hooks'

export function ReviewSessionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const detail = useSessionDetail(Number(id))

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
        <span
          aria-label={answer.is_correct ? 'Đúng' : 'Sai'}
          className={cn(
            'text-body w-5 shrink-0 text-center',
            answer.is_correct ? 'text-success' : 'text-danger',
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
