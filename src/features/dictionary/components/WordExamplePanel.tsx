import { AudioButton } from '@/components/common/AudioButton'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import type { useSpeech } from '@/hooks/use-speech'
import type { ExampleSentence, RelatedWord } from '@/types/dictionary'
import { AiSourceNote } from './AiSourceNote'
import { RelatedWordList } from './RelatedWordList'

/**
 * Tab "Ví dụ" — từ này ĐI VỚI cái gì.
 *
 * Gom ba khối từng là ba `Card` rời ở cấp trang: câu ví dụ (Tatoeba), từ ghép
 * và thành ngữ (AI). Chúng cùng trả lời một câu hỏi — dùng từ này ra sao — nên
 * gom lại là gom theo NGHĨA, không phải để trang ngắn đi.
 *
 * ## Tab DUY NHẤT có thể rỗng thật
 *
 * Câu ví dụ chỉ phủ ~75% từ, còn từ ghép/thành ngữ là nội dung AI và có thể
 * `unavailable`. Nên đây là tab cần `EmptyState` nói ra vì sao trống, thay vì
 * biến mất khỏi thanh tab.
 *
 * ## Hai nhãn nguồn KHÁC NHAU, không gộp
 *
 * "Nghĩa tiếng Việt do AI dịch từ bản tiếng Anh" nói về DÒNG DỊCH của câu
 * Tatoeba — bản thân câu là của người thật, có tác giả, có giấy phép. "Nội dung
 * do AI sinh" nói về cả mục từ ghép/thành ngữ. Gộp hai câu này là gán sai nguồn
 * cho một trong hai khối.
 */
export function WordExamplePanel({
  examples,
  translationById,
  translating,
  relatedWords,
  idioms,
  speech,
}: {
  examples: ExampleSentence[]
  /** Ghép theo id câu, KHÔNG theo thứ tự mảng — hai truy vấn khác nhau. */
  translationById: Map<number, string>
  translating: boolean
  relatedWords: RelatedWord[]
  idioms: RelatedWord[]
  speech: ReturnType<typeof useSpeech>
}) {
  const hasRelated = relatedWords.length > 0 || idioms.length > 0

  if (examples.length === 0 && !hasRelated) {
    return (
      <Card>
        <EmptyState
          title="Chưa có ví dụ cho từ này"
          description="Kho câu Tatoeba phủ khoảng 75% mục từ — từ hiếm thường chưa có câu nào."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {examples.length > 0 && (
        <Card>
          <h2 className="text-section">Ví dụ</h2>

          {/*
            Nhãn nguồn MỘT lần cho cả khối, không phải mỗi câu: ba nhãn giống hệt
            nhau trong một thẻ là nhiễu, và người đọc bỏ qua cả ba.

            Hiện ngay từ lúc CÒN ĐANG DỊCH, không đợi câu đầu tiên về. Đợi thì
            nhãn tự chèn vào sau và đẩy cả danh sách xuống ~20px — trong khi
            ngay bên dưới, khung xương đang hứa điều ngược lại.

            `unavailable` vẫn rơi vào vế không hiện gì: lúc đó `translating` là
            `false` và chưa có bản dịch nào.
          */}
          {(translating || translationById.size > 0) && (
            <p className="text-caption text-text-secondary mt-1">
              Nghĩa tiếng Việt do AI dịch từ bản tiếng Anh.
            </p>
          )}

          <ul className="mt-3 space-y-4" aria-busy={translating}>
            {examples.map((example) => (
              <ExampleRow
                key={example.id}
                example={example}
                translation={translationById.get(example.id) ?? null}
                translating={translating}
                audioState={speech.stateFor(`example:${example.id}`)}
                onPlay={() => speech.play(example.sentence_zh, `example:${example.id}`)}
              />
            ))}
          </ul>
        </Card>
      )}

      {relatedWords.length > 0 && (
        <Card>
          <RelatedWordList title="Từ ghép" items={relatedWords} />
          <AiSourceNote className="mt-3" />
        </Card>
      )}

      {idioms.length > 0 && (
        <Card>
          <RelatedWordList title="Thành ngữ" items={idioms} />
          <AiSourceNote className="mt-3" />
        </Card>
      )}
    </div>
  )
}

function ExampleRow({
  example,
  translation,
  translating,
  audioState,
  onPlay,
}: {
  example: ExampleSentence
  translation: string | null
  translating: boolean
  audioState: ReturnType<typeof useSpeech>['state']
  onPlay: () => void
}) {
  return (
    <li className="space-y-1">
      <div className="flex items-start gap-2">
        <p lang="zh-Hans" className="font-hanzi text-meaning text-text-primary flex-1">
          {example.sentence_zh}
        </p>
        <AudioButton state={audioState} onPlay={onPlay} size="sm" />
      </div>

      {/*
        Nghĩa tiếng Việt đứng TRÊN dòng tiếng Anh và ở bậc chữ cao hơn: đây là
        dòng người học đọc trước.

        Không có bản dịch thì ẩn HẲN, không hiện khung trống — cùng quy ước mà
        `han_viet: null` và `examples: []` đang giữ.
      */}
      {translation !== null && <p className="text-meaning text-text-primary">{translation}</p>}

      {/*
        `h-6` khớp hộp dòng của `text-meaning` (24px), nên bản dịch tới nơi thay
        vào đúng chỗ khung xương đang đứng thay vì đẩy phần còn lại của thẻ xuống.

        Skeleton chứ không phải spinner hay chữ "đang dịch", theo `ux-rules.md`:
        spinner nói "đang chờ", skeleton nói "sắp có gì ở đây".
      */}
      {translation === null && translating && <Skeleton className="h-6 w-4/5" />}

      {/*
        Dòng tiếng Anh Ở LẠI, nhỏ và nhạt hơn dòng Việt.

        Bản Việt do máy dịch và không có người rà, nên đây là cơ chế đối chiếu duy
        nhất người học có — cùng lý do `definitions_vi` không bao giờ thay thế
        `definitions_en`.

        KHÔNG có dòng pinyin cho câu (D6).
      */}
      <p className="text-body text-text-secondary">{example.translation_en}</p>

      {/*
        Ghi công tác giả — nghĩa vụ CC BY của Tatoeba, không phải chi tiết trang
        trí. Nhỏ và quiet, nhưng phải có mặt.
      */}
      {example.contributor && (
        <p className="text-caption text-text-secondary">
          Tatoeba · {example.contributor} · {example.license}
        </p>
      )}
    </li>
  )
}
