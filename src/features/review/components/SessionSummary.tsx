import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { SessionDetail } from '../history-api'
import { averageDurationMs, formatDuration } from '../duration'
import { SessionAnswerList } from './SessionAnswerList'
import { SessionScoreCard } from './SessionScoreCard'

/**
 * Tổng kết phiên: điểm do SERVER chốt, TỪNG câu đúng/sai, và ba lối đi.
 *
 * Nhận nguyên `SessionDetail` — cùng payload mà trang chi tiết phiên đọc, và
 * render bằng cùng component. Trước đây màn này tự cộng điểm trong state React,
 * nên tổng kết mất sạch khi rời trang và không có cách nào xem lại.
 */
export function SessionSummary({
  outcome,
  onReviewWrong,
  onGoHistory,
  onGoVocabulary,
  onSelectWord,
}: {
  outcome: SessionDetail
  onReviewWrong: () => void
  onGoHistory: () => void
  onGoVocabulary: () => void
  onSelectWord: (wordId: number) => void
}) {
  const { session, answers } = outcome

  /*
   * Loại `is_retry` khi đếm câu sai: lượt làm lại không tính vào điểm, nên đếm
   * chúng ở đây sẽ cho ra một con số khác với con số ngay trên đầu màn.
   */
  const wrongCount = answers.filter((answer) => !answer.is_correct && !answer.is_retry).length
  const averageMs = averageDurationMs(answers)

  return (
    <div className="animate-rise space-y-4">
      <SessionScoreCard
        score={session.score}
        grade={session.grade}
        correct={session.correct_count}
        total={session.answered_count}
        durationSeconds={session.duration_seconds}
        averageMs={averageMs}
      />

      {answers.length > 0 && (
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
            {/* TẤT CẢ các lượt, không chỉ câu sai: người học muốn thấy mình đã
                làm gì, và câu đúng cũng là thông tin. */}
            <SessionAnswerList answers={answers} onSelectWord={onSelectWord} />
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {wrongCount > 0 && (
          <Button fullWidth onClick={onReviewWrong}>
            Ôn lại {wrongCount} từ sai
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
