import { AudioButton } from '@/components/common/AudioButton'
import { HanziText } from '@/components/common/HanziText'
import { Pinyin } from '@/components/common/Pinyin'
import { CheckIcon, CloseIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { useSpeech } from '@/hooks/use-speech'
import { cn } from '@/lib/cn'
import type { AnswerResult } from '../api'

/**
 * Phản hồi đúng/sai.
 *
 * **ICON là bắt buộc, không chỉ đổi màu.** Khoảng 8% nam giới mù màu đỏ-lục, và
 * xanh-nhạt vs hồng-nhạt là đúng cặp màu họ không phân biệt được. Icon check/x
 * cộng chữ "Chính xác"/"Chưa đúng" khiến kết quả đọc được mà không cần màu.
 *
 * Hiển thị đủ chữ Hán, pinyin, âm Hán-Việt VÀ định nghĩa tiếng Anh: âm Hán-Việt
 * không phải nghĩa (`东西` → `đông tây`), nên bỏ tiếng Anh đi là dạy sai đúng
 * lúc người học đang chú ý nhất.
 */
export function AnswerFeedback({
  result,
  definitions,
  onContinue,
}: {
  result: AnswerResult
  definitions: string[]
  onContinue: () => void
}) {
  const speech = useSpeech()
  const answer = result.correct_answer

  return (
    <section
      // `role="status"` để screen reader đọc kết quả ngay khi nó xuất hiện.
      role="status"
      aria-live="polite"
      className={cn(
        'space-y-3 rounded-[--radius-card-lg] border p-4',
        result.correct ? 'border-success/40 bg-success/10' : 'border-error/40 bg-error/10',
      )}
    >
      <p className="text-section flex items-center gap-2">
        {result.correct ? (
          <CheckIcon size={20} className="text-success" />
        ) : (
          <CloseIcon size={20} className="text-error" />
        )}
        <span className={result.correct ? 'text-success' : 'text-error'}>
          {result.correct ? 'Chính xác' : 'Chưa đúng'}
        </span>
      </p>

      <div className="flex items-center gap-3">
        <HanziText size="title">{answer.simplified}</HanziText>
        <div className="flex-1">
          <Pinyin className="text-body">{answer.pinyin}</Pinyin>
          {answer.han_viet && <p className="text-body text-text-primary">{answer.han_viet}</p>}
        </div>
        <AudioButton state={speech.state} onPlay={() => speech.play(answer.simplified)} size="sm" />
      </div>

      {definitions.length > 0 && (
        <p className="text-body text-text-secondary">{definitions.join('; ')}</p>
      )}

      <Button fullWidth onClick={onContinue} autoFocus>
        Tiếp tục
      </Button>
    </section>
  )
}
