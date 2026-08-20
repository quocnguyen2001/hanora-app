import { HanziText } from '@/components/common/HanziText'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { AnswerResult } from '../api'

export interface SessionResult {
  correct: number
  total: number
  wrong: AnswerResult['correct_answer'][]
}

/** Tổng kết phiên: số đúng, danh sách từ sai, và hai lối đi tiếp. */
export function SessionSummary({
  result,
  onReviewWrong,
  onGoVocabulary,
}: {
  result: SessionResult
  onReviewWrong: () => void
  onGoVocabulary: () => void
}) {
  const percent = result.total === 0 ? 0 : Math.round((result.correct / result.total) * 100)

  return (
    <div className="space-y-4">
      <Card size="hero" className="text-center">
        <p className="text-section text-text-secondary">Xong phiên ôn</p>
        <p className="text-primary mt-2 text-4xl font-semibold">
          {result.correct} / {result.total}
        </p>
        <p className="text-body text-text-secondary mt-1">Đúng {percent}%</p>
      </Card>

      {result.wrong.length > 0 && (
        <Card>
          <h2 className="text-section">Từ cần ôn thêm</h2>
          <ul className="mt-3 space-y-2">
            {result.wrong.map((word) => (
              <li key={word.word_id} className="flex items-center gap-3">
                <HanziText size="inline">{word.simplified}</HanziText>
                <span className="text-body text-text-secondary">{word.pinyin}</span>
                {word.han_viet && <span className="text-body">{word.han_viet}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-2">
        {result.wrong.length > 0 && (
          <Button fullWidth onClick={onReviewWrong}>
            Ôn lại từ sai
          </Button>
        )}
        <Button variant="secondary" fullWidth onClick={onGoVocabulary}>
          Về kho từ
        </Button>
      </div>
    </div>
  )
}
