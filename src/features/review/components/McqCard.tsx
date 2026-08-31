import { AudioButton } from '@/components/common/AudioButton'
import { HanziPlate } from '@/components/common/HanziPlate'
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
        <HanziPlate>{item.word.simplified}</HanziPlate>
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
              'rounded-card flex min-h-14 w-full items-center gap-3 border px-4 text-left',
              // Ô đáp án là phím bấm, không phải dòng danh sách: nó dày lên và
              // lún xuống như nút. Đây là vùng chạm người học dùng nhiều nhất
              // trong cả app, nên nó phải trả lời rõ nhất.
              'chunky text-meaning font-medium',
              'disabled:cursor-not-allowed',
              selectedWordId === option.word_id
                ? 'border-primary bg-primary-soft chunky-primary'
                : 'border-border bg-surface hover:bg-primary-pale chunky-neutral',
            )}
          >
            {/* Đánh số theo showcase — cũng giúp nói "chọn số 2" khi hướng dẫn. */}
            <span className="bg-primary-pale text-caption text-text-secondary flex size-8 shrink-0 items-center justify-center rounded-full font-bold">
              {index + 1}
            </span>
            <span lang="vi">{option.text}</span>
          </button>
        ))}
      </fieldset>
    </div>
  )
}
