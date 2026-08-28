import { AudioButton } from '@/components/common/AudioButton'
import { HanziText } from '@/components/common/HanziText'
import { Pinyin } from '@/components/common/Pinyin'
import { Badge } from '@/components/ui/Badge'
import { useSpeech } from '@/hooks/use-speech'
import { cn } from '@/lib/cn'
import type { SearchTranslation } from '@/types/dictionary'

/**
 * Bản dịch cả câu, hiện trên đầu danh sách kết quả.
 *
 * Gõ `bạn có nhớ tôi không?` thì thứ người ta muốn là `你还记得我吗？`, không
 * phải 你 / 记得 / 我 xếp thành hàng. Danh sách từ vẫn còn ngay bên dưới để tra
 * từng chữ, nhưng câu trả lời đứng trước.
 *
 * ## Vì sao KHÔNG dùng `VocabularyCard`
 *
 * Thẻ đó bấm vào là mở trang chi tiết và có nút lưu vào kho. Câu dịch không có
 * `id`, nên cả hai hành vi đó đều không tồn tại ở đây. Mượn lại thẻ kia sẽ tạo
 * một thẻ trông y hệt các thẻ bấm được nhưng không bấm được — đúng loại nút
 * chết mà plan đã cắt tab `Hán tự` để tránh.
 *
 * Vì thế thẻ này cố tình khác diện mạo: viền trái nhấn, nền pale, không nút lưu.
 * Bấm vào nó mở trang PHÂN TÍCH CÂU — tách từ, nghĩa đen, ghi chú ngữ pháp — chứ
 * không phải trang chi tiết từ.
 *
 * ## Nhãn nguồn là bắt buộc
 *
 * Nội dung do máy dịch, không có người rà, và người học không có cách nào tự
 * kiểm. Nhãn `AI dịch` không phải trang trí — nó là thứ duy nhất nói cho người
 * dùng biết dòng này khác bản chất với mọi dòng còn lại trên màn hình, vốn đều
 * đến từ từ điển có nguồn.
 */
export function TranslationCard({
  translation,
  onSelect,
}: {
  translation: SearchTranslation
  onSelect?: () => void
}) {
  const speech = useSpeech()

  return (
    <section
      aria-label="Bản dịch câu vừa nhập"
      className={cn(
        'bg-primary-pale border-primary rounded-card flex items-start gap-3 border-l-4 p-4',
        'transition duration-press ease-soft',
        onSelect && 'hover:bg-primary-soft active:scale-[0.99]',
      )}
    >
      {/*
        Nút bọc phần nội dung, KHÔNG bọc cả thẻ: `AudioButton` phải nằm ngoài nó.
        Nút lồng trong nút là HTML không hợp lệ và trình duyệt sẽ tự gỡ rối theo
        cách riêng của nó — cùng khuôn mà `VocabularyCard` đang dùng.
      */}
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        aria-label={`Phân tích câu ${translation.zh}`}
        className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left disabled:cursor-default">
        <Badge tone="primary">AI dịch</Badge>

        {/*
          `title` chứ không phải `hero`: đây là một CÂU, không phải một từ đơn.
          Cỡ hero dành cho chữ Hán đứng một mình ở trang chi tiết, và một câu ở
          cỡ đó sẽ tràn xuống ba dòng trên màn hình điện thoại.
        */}
        <HanziText size="title" className="break-words">
          {translation.zh}
        </HanziText>

        <Pinyin className="break-words">{translation.pinyin}</Pinyin>

        <span className="text-caption text-text-secondary">
          {onSelect
            ? 'Bấm để xem tách từ và ngữ pháp — bản dịch do AI tạo.'
            : 'Bản dịch cả câu do AI tạo — có thể chưa chuẩn.'}
        </span>
      </button>

      <AudioButton state={speech.state} onPlay={() => speech.play(translation.zh)} />
    </section>
  )
}
