import { AudioButton } from '@/components/common/AudioButton'
import { HanViet } from '@/components/common/HanViet'
import { HanziText } from '@/components/common/HanziText'
import { Pinyin } from '@/components/common/Pinyin'
import { WordIllustration } from '@/components/common/WordIllustration'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useSpeech } from '@/hooks/use-speech'
import type { TopicWord } from '../api'

/**
 * Trần lượt hỏi ảnh cho MÀN HỌC, thấp hơn hẳn màn chi tiết từ (10).
 *
 * Từ chủ đề theo định nghĩa là từ chưa ai mở, nên gần như luôn rơi vào nhánh
 * `pending`. Ảnh không về trong ~6 giây thì giữ placeholder — thẻ học dùng được
 * mà không cần ảnh, còn 10 thẻ × 11 request là chạm trần 60/phút của API và
 * người dùng bị chặn không lưu được từ.
 */
const CARD_MAX_POLLS = 2

export function TopicWordCard({
  word,
  position,
  total,
  onSave,
  onSkip,
  onUndoSkip,
  pending,
  error,
}: {
  word: TopicWord
  position: number
  total: number
  onSave: () => void
  onSkip: () => void
  onUndoSkip: (() => void) | null
  pending: boolean
  error: string | null
}) {
  const speech = useSpeech()

  return (
    <div className="space-y-4">
      <p className="text-caption text-text-secondary text-center" aria-live="polite">
        Thẻ {position}/{total}
      </p>

      <Card size="hero" className="space-y-4 text-center">
        <WordIllustration
          wordId={word.id}
          maxPolls={CARD_MAX_POLLS}
          className="mx-auto w-32"
        />

        <div className="flex items-center justify-center gap-2">
          <HanziText>{word.simplified}</HanziText>
          <AudioButton
            state={speech.state}
            onPlay={() => speech.play(word.simplified)}
            name={word.simplified}
          />
        </div>

        <Pinyin>{word.pinyin}</Pinyin>
        <HanViet>{word.han_viet}</HanViet>

        <hr className="border-border" />

        {word.definition_vi !== null && (
          <p className="text-body text-text-primary">{word.definition_vi}</p>
        )}

        {/*
          Dòng tiếng Anh Ở LẠI dưới nghĩa Việt.
          Nghĩa Việt CVDICT do máy dịch, tác giả thừa nhận còn sót lỗi, và đây là
          cơ chế đối chiếu duy nhất người học có — cùng lập luận đã ghi hai lần
          trong `types/dictionary.ts`.
        */}
        {word.definition_en !== null && (
          <p className="text-caption text-text-secondary">{word.definition_en}</p>
        )}
      </Card>

      {error !== null && (
        <p role="alert" className="text-caption text-error text-center">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {/*
          KHÔNG optimistic: nút bị chặn khi đang gửi và thẻ chỉ chuyển khi
          `onSuccess`. `api.ts` chặn mọi non-GET lúc ngoại tuyến với hợp đồng
          "tuyệt đối không giả vờ đã lưu" — sang thẻ ngay chính là giả vờ đã lưu.
        */}
        <Button variant="secondary" className="flex-1" onClick={onSkip} disabled={pending}>
          Đã biết rồi
        </Button>
        <Button className="flex-1" onClick={onSave} disabled={pending}>
          Thêm vào kho
        </Button>
      </div>

      {/*
        Hoàn tác NGAY TRÊN THẺ, không phải một endpoint `DELETE`.
        Nó chỉ hiện trong lúc request còn bay, tức đúng cửa sổ của thao tác bấm
        nhầm — và không đẻ thêm endpoint thứ tư cho một ca mà `POST /vocabulary`
        đã giải được.
      */}
      {onUndoSkip !== null && (
        <Button variant="ghost" className="w-full" onClick={onUndoSkip}>
          Hoàn tác
        </Button>
      )}
    </div>
  )
}
