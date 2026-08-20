import { AudioButton } from '@/components/common/AudioButton'
import { HanziText } from '@/components/common/HanziText'
import { IllustrationPlaceholder } from '@/components/common/IllustrationPlaceholder'
import { Pinyin } from '@/components/common/Pinyin'
import { Card } from '@/components/ui/Card'
import { useSpeech } from '@/hooks/use-speech'
import { cn } from '@/lib/cn'
import type { McqItem } from '../api'

/**
 * Trắc nghiệm 4 đáp án, hỏi ÂM HÁN-VIỆT (D13).
 *
 * Mỗi lựa chọn mang `word_id` của từ có âm đó; FE gửi lại `answer_word_id` và
 * server tự chấm. Không lặp logic chấm ở FE, và không cần state phiên phía
 * server (red team C1).
 */
export function McqCard({
  item,
  disabled,
  selectedWordId,
  onSelect,
}: {
  item: McqItem
  disabled: boolean
  selectedWordId: number | null
  onSelect: (wordId: number) => void
}) {
  const speech = useSpeech()

  return (
    <div className="space-y-4">
      <Card size="hero" className="flex flex-col items-center gap-3 text-center">
        <IllustrationPlaceholder className="w-24" />
        <HanziText size="hero">{item.word.simplified}</HanziText>
        <div className="flex items-center gap-2">
          <Pinyin>{item.word.pinyin}</Pinyin>
          <AudioButton state={speech.state} onPlay={() => speech.play(item.word.simplified)} />
        </div>
      </Card>

      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-section mb-2">Âm Hán-Việt của từ này là?</legend>

        {item.options.map((option, index) => (
          <button
            key={option.word_id}
            type="button"
            onClick={() => onSelect(option.word_id)}
            className={cn(
              'flex min-h-14 w-full items-center gap-3 rounded-[--radius-card] border px-4 text-left',
              'text-meaning transition-colors duration-150',
              'disabled:cursor-not-allowed',
              selectedWordId === option.word_id
                ? 'border-primary bg-primary-soft'
                : 'border-border bg-surface hover:bg-primary-pale',
            )}
          >
            {/* Đánh số theo showcase — cũng giúp nói "chọn số 2" khi hướng dẫn. */}
            <span className="bg-primary-pale text-caption text-text-secondary flex size-7 shrink-0 items-center justify-center rounded-full">
              {index + 1}
            </span>
            <span lang="vi">{option.text}</span>
          </button>
        ))}
      </fieldset>
    </div>
  )
}
