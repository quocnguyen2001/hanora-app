import { Badge } from '@/components/ui/Badge'
import type { WordSummary } from '@/types/dictionary'
import { AudioButton, type AudioState } from './AudioButton'
import { HanViet } from './HanViet'
import { HanziText } from './HanziText'
import { Pinyin } from './Pinyin'
import { WordIllustration } from './WordIllustration'

/**
 * Khối đầu màn chi tiết từ.
 *
 * THỨ TỰ CỨNG, không phải gợi ý:
 *   chữ Hán → pinyin → âm Hán-Việt → tags → illustration → nghĩa Việt → nghĩa Anh
 *
 * Đây là hierarchy mà cả design system lẫn Success Criteria của P6/P8 đều đòi.
 * Đổi thứ tự là đổi thứ người học nhìn thấy trước, tức đổi thứ họ nhớ.
 */
export function WordDetailHero({
  word,
  audioState = 'idle',
  onPlayAudio,
  actions,
  illustration,
}: {
  word: WordSummary
  audioState?: AudioState
  onPlayAudio?: () => void
  actions?: React.ReactNode
  /**
   * Ghi đè khối ảnh minh hoạ.
   *
   * Tồn tại cho trang gallery thiết kế: mặc định hero TỰ gọi API ảnh theo
   * `word.id`, nên render nó với một từ mẫu sẽ tạo bản ghi và xếp một job
   * Pixabay thật cho một từ chẳng liên quan. Gallery truyền thẳng placeholder
   * vào đây thay vì kéo theo tác dụng phụ đó.
   */
  illustration?: React.ReactNode
}) {
  return (
    <section className="bg-surface shadow-card flex flex-col items-center gap-3 rounded-hero p-6 text-center">
      <HanziText size="hero">{word.simplified}</HanziText>

      {word.traditional !== word.simplified && (
        <span className="text-caption text-text-secondary">
          Phồn thể: <HanziText size="inline">{word.traditional}</HanziText>
        </span>
      )}

      <div className="flex items-center gap-2">
        <Pinyin>{word.pinyin}</Pinyin>
        <AudioButton state={audioState} onPlay={onPlayAudio} />
      </div>

      <HanViet>{word.han_viet}</HanViet>

      {word.hsk_level !== null && <Badge tone="primary">HSK {word.hsk_level}</Badge>}

      {/*
        Ảnh minh hoạ giữ NGUYÊN vị trí và kích thước mà placeholder đang giữ.
        `WordIllustration` tự rơi về chính placeholder đó khi từ này không có
        ảnh — chuyện thường gặp, vì cổng chặn phía API cố tình từ chối hư từ và
        từ trừu tượng.
      */}
      {illustration ?? <WordIllustration wordId={word.id} className="mt-2 w-32" />}

      {/*
        Nghĩa tiếng Việt đứng TRƯỚC — thứ người học Việt đọc trước — và hiện ĐỦ
        ở đây, khác thẻ từ vốn chỉ lấy nghĩa đầu.

        Ẩn HẲN khi `null` (~7% từ không có trong CVDICT). Không khung trống,
        không dòng "chưa có nghĩa": từ đó vẫn dùng được bình thường bằng tiếng
        Anh, đúng như trước phase này.
      */}
      {word.definitions_vi && word.definitions_vi.length > 0 && (
        <ul className="text-meaning text-text-primary mt-1 space-y-1">
          {word.definitions_vi.map((meaning) => (
            <li key={meaning}>{meaning}</li>
          ))}
        </ul>
      )}

      {/*
        Định nghĩa tiếng Anh LUÔN có mặt và không bao giờ bị thay thế (R1) — kể
        cả khi đã có nghĩa tiếng Việt.

        Trước phase này lý do là `东西` đọc `đông tây` nhưng nghĩa là "thứ, đồ
        vật". Giờ có thêm một lý do mạnh hơn: nghĩa tiếng Việt dịch bằng AI có
        người rà và tác giả thừa nhận còn sót lỗi, nên đây là cơ chế đối chiếu
        duy nhất người học có khi nghi ngờ. Nó nhạt hơn nghĩa Việt về mặt thị
        giác, nhưng có mặt.
      */}
      <ul className="text-body text-text-secondary space-y-1">
        {word.definitions_en.map((definition) => (
          <li key={definition}>{definition}</li>
        ))}
      </ul>

      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </section>
  )
}
