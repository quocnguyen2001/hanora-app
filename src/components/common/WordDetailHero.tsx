import { Badge } from '@/components/ui/Badge'
import type { WordSummary } from '@/types/dictionary'
import { AudioButton, type AudioState } from './AudioButton'
import { HanViet } from './HanViet'
import { HanziPlate } from './HanziPlate'
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
  suppressVietnameseDefinitions = false,
}: {
  word: WordSummary
  audioState?: AudioState
  onPlayAudio?: () => void
  actions?: React.ReactNode
  /**
   * Ẩn danh sách nghĩa tiếng Việt của hero.
   *
   * Tồn tại cho đúng một ca: màn chi tiết đã có `senses` — cùng nghĩa đó nhưng
   * đã nhóm theo từ loại — và hai danh sách nghĩa Việt cạnh nhau nói gần như
   * cùng một việc. Ẩn ở đây thay vì bỏ hẳn khối `senses` xuống dưới, vì `senses`
   * là bản ĐỌC ĐƯỢC HƠN của cùng thông tin.
   *
   * Mặc định `false`, nên `GalleryPage` và mọi chỗ dùng khác không đổi.
   *
   * KHÔNG ảnh hưởng `definitions_en`: nó luôn ở lại (luật R1), và càng phải ở
   * lại khi thứ thay chỗ nghĩa Việt là nội dung do AI sinh chưa ai rà.
   */
  suppressVietnameseDefinitions?: boolean
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
    <section className="bg-surface shadow-card rounded-hero flex flex-col items-center gap-3 p-6 text-center">
      <HanziPlate>{word.simplified}</HanziPlate>

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
        Lượng từ đứng SAU badge HSK và TRƯỚC ảnh minh hoạ.

        Nó thuộc hero chứ không phải một `Card` riêng vì nó là thuộc tính NGỮ
        PHÁP của chính từ đang tra, không phải nội dung mở rộng — cùng loại với
        pinyin và âm Hán-Việt phía trên. Sau HSK vì cả hai đều là nhãn phân loại
        ngắn; trước ảnh vì ảnh mở đầu phần "nội dung" của hero.

        Ẩn HẲN khi rỗng — quy ước `han_viet: null` đang giữ. Đây là ca THƯỜNG
        GẶP: đo trên nguồn thật chỉ 1.554 / 123.646 mục có lượng từ.
      */}
      {word.measure_words.length > 0 && (
        <p className="text-body text-text-secondary">
          Lượng từ:{' '}
          {word.measure_words.map((measure, index) => (
            <span key={measure.simplified}>
              {index > 0 && ' · '}
              {/* `HanziText size="inline"` chứ không chữ thô: cùng lý do dòng
                  "Phồn thể" ngay trên đang dùng nó — chữ Hán lẫn trong dòng chữ
                  latin cần font Hán, không phải font giao diện. */}
              <HanziText size="inline">{measure.simplified}</HanziText>
              {measure.pinyin !== '' && ` ${measure.pinyin}`}
            </span>
          ))}
        </p>
      )}

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
      {!suppressVietnameseDefinitions && word.definitions_vi && word.definitions_vi.length > 0 && (
        <ul className="text-meaning text-text-primary mt-1 w-full space-y-1 text-left">
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
      {/*
        HAI khối nghĩa căn TRÁI, phần còn lại của hero vẫn căn giữa.

        Khối nhận diện phía trên — chữ Hán, pinyin, âm Hán-Việt, badge, ảnh — là
        những dòng ngắn, một dòng mỗi thứ, và căn giữa làm chúng đọc ra như một
        khối duy nhất. Hai danh sách nghĩa thì ngược lại: chúng nhiều mục, dài
        ngắn khác nhau, và trên máy 360px gần như mục nào cũng xuống dòng. Căn
        giữa một danh sách như thế cho mỗi mục một mép trái riêng, nên mắt phải
        dò lại điểm bắt đầu ở từng dòng — chính thứ mà quy tắc độ dài dòng của
        `responsive.md` muốn tránh.

        `w-full` là BẮT BUỘC đi kèm `text-left`. Cha là `flex flex-col
        items-center`, nên `<ul>` co về đúng bề rộng nội dung và một mình
        `text-left` sẽ không đổi gì thấy được.
      */}
      <ul className="text-body text-text-secondary w-full space-y-1 text-left">
        {word.definitions_en.map((definition) => (
          <li key={definition}>{definition}</li>
        ))}
      </ul>

      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </section>
  )
}
