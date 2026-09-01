import { Link } from 'react-router'
import { HanziText } from '@/components/common/HanziText'
import type { RelatedWord } from '@/types/dictionary'

/**
 * Danh sách từ ghép hoặc thành ngữ.
 *
 * MỘT component cho cả hai: chúng có cùng hình dạng dữ liệu và cùng cách đọc,
 * nên hai component riêng chỉ là hai chỗ để lệch nhau. Khác biệt duy nhất là
 * tiêu đề, và đó là một prop.
 *
 * Mỗi mục có HAI hình dạng, quyết định bởi `word_id`:
 *
 *   có id    — `<Link>`, mở trang chi tiết từ đó
 *   không id — `<li>` tĩnh
 *
 * Không có id là chuyện thường: bản làm giàu sinh trước khi API biết tra ngược
 * thì không có trường này, và model đôi khi đưa ra từ không có trong từ điển.
 * Cho tất cả trông bấm được rồi để một nửa bấm không ra gì thì tệ hơn hẳn — đó
 * chính là luật mà `SentenceToken.word_id: null` đang giữ ở màn chi tiết câu.
 */
export function RelatedWordList({ title, items }: { title: string; items: RelatedWord[] }) {
  return (
    <>
      <h2 className="text-section">{title}</h2>

      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={`${item.simplified}-${item.pinyin}`}>
            {item.word_id === null ? (
              <RelatedWordBody item={item} />
            ) : (
              /* `-mx-2 px-2` để vùng chạm rộng hết bề ngang thẻ mà chữ vẫn
                 thẳng hàng với các mục tĩnh bên cạnh. */
              <Link
                to={`/words/${item.word_id}`}
                className="hover:bg-primary-pale duration-press ease-soft -mx-2 flex rounded-lg px-2 py-1 transition active:scale-[0.99]"
              >
                <RelatedWordBody item={item} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

function RelatedWordBody({ item }: { item: RelatedWord }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <HanziText size="inline">{item.simplified}</HanziText>

      {item.pinyin !== '' && <span className="text-body text-text-secondary">{item.pinyin}</span>}

      {/* Nghĩa xuống dòng riêng trên máy hẹp nhờ `flex-wrap` + `basis-full`:
          chữ Hán và pinyin là một cặp đọc liền, nghĩa là dòng thứ hai. */}
      {item.vi !== '' && (
        <span className="text-body text-text-primary basis-full sm:basis-auto">{item.vi}</span>
      )}
    </span>
  )
}
