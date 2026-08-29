import { HanziText } from '@/components/common/HanziText'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { SessionDetail } from '../history-api'
import { SessionScoreCard } from './SessionScoreCard'

/**
 * Tổng kết phiên: điểm do SERVER chốt, danh sách từ sai, và ba lối đi.
 *
 * Nhận nguyên `SessionDetail` — cùng payload mà trang chi tiết phiên đọc. Trước
 * đây màn này tự cộng điểm trong state React, nên tổng kết mất sạch khi rời
 * trang và không có cách nào xem lại.
 */
export function SessionSummary({
  outcome,
  onReviewWrong,
  onGoHistory,
  onGoVocabulary,
}: {
  outcome: SessionDetail
  onReviewWrong: () => void
  onGoHistory: () => void
  onGoVocabulary: () => void
}) {
  const { session, answers } = outcome

  /*
   * Lọc ở CLIENT từ cùng một danh sách mà trang lịch sử dùng.
   *
   * Loại `is_retry` vì lượt làm lại không tính vào điểm — hiện chúng ở đây sẽ
   * cho ra một con số "từ sai" khác với con số trên trang chi tiết của đúng
   * phiên này.
   */
  const wrong = answers.filter((answer) => !answer.is_correct && !answer.is_retry)

  return (
    <div className="space-y-4">
      <SessionScoreCard
        score={session.score}
        grade={session.grade}
        correct={session.correct_count}
        total={session.answered_count}
        durationSeconds={session.duration_seconds}
      />

      {wrong.length > 0 && (
        <Card>
          <h2 className="text-section">Từ cần ôn thêm</h2>
          <ul className="mt-3 space-y-2">
            {wrong.map((answer) => (
              <li key={answer.id} className="flex items-center gap-3">
                <HanziText size="inline">{answer.word.simplified}</HanziText>
                <span className="text-body text-text-secondary">{answer.word.pinyin}</span>
                {answer.word.han_viet && <span className="text-body">{answer.word.han_viet}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-2">
        {wrong.length > 0 && (
          <Button fullWidth onClick={onReviewWrong}>
            Ôn lại từ sai
          </Button>
        )}
        <Button variant="secondary" fullWidth onClick={onGoHistory}>
          Xem lịch sử ôn tập
        </Button>
        <Button variant="ghost" fullWidth onClick={onGoVocabulary}>
          Về kho từ
        </Button>
      </div>
    </div>
  )
}
