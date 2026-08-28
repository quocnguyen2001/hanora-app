import { ApiError, apiRequestWithMeta, apiRequest } from '@/lib/api'
import type { SearchModeChoice } from '@/stores/search-mode'
import type {
  SearchMeta,
  SearchTranslation,
  SentenceDetail,
  WordDetail,
  WordSummary,
} from '@/types/dictionary'

/**
 * Kiểm hình dạng `translation` trước khi cho nó vào app.
 *
 * Trường này do AI sinh, và API chỉ kiểm được rằng `zh` có chứa chữ Hán — nó
 * KHÔNG tra ngược được vào từ điển như với danh sách từ, vì một câu không bao
 * giờ là mục từ điển. Ở đây kiểm lại phần còn lại: thiếu `zh` hoặc `pinyin` thì
 * thẻ dịch sẽ render một dòng trống, tệ hơn là không render.
 *
 * Bỏ qua trường lạ thay vì ném: một trường phụ hỏng không được phép làm hỏng cả
 * kết quả tìm kiếm.
 */
function parseTranslation(raw: unknown): SearchTranslation | null {
  if (raw === null || typeof raw !== 'object') return null

  const value = raw as Record<string, unknown>
  const zh = typeof value.zh === 'string' ? value.zh.trim() : ''
  const pinyin = typeof value.pinyin === 'string' ? value.pinyin.trim() : ''

  if (zh === '' || pinyin === '') return null

  return {
    zh,
    pinyin,
    vi: typeof value.vi === 'string' ? value.vi.trim() : '',
    source: 'ai',
  }
}

/**
 * `mode` quyết định API chạy nhánh nào cho chuỗi latin: `vi` chỉ âm Hán-Việt và
 * nghĩa tiếng Việt, `cn` chỉ chữ Hán và pinyin.
 *
 * `null` → KHÔNG gửi tham số, và API tự đoán bằng `QueryClassifier` như trước.
 * Bỏ hẳn khỏi query string chứ không gửi chuỗi rỗng: `mode=` sẽ trượt luật
 * `Rule::in` và trả 422.
 *
 * `translation` là trường cấp cao thứ ba, ngang hàng `data` và `meta` — xem
 * `SearchTranslation` để biết vì sao nó không nằm trong `data`.
 */
export async function searchWords(
  query: string,
  mode: SearchModeChoice,
  page = 1,
): Promise<{
  words: WordSummary[]
  meta: SearchMeta
  translation: SearchTranslation | null
}> {
  const envelope = await apiRequestWithMeta<WordSummary[]>('/dictionary/search', {
    query: { q: query, page, ...(mode === null ? {} : { mode }) },
  })

  return {
    words: envelope.data,
    meta: envelope.meta as SearchMeta,
    translation: parseTranslation(envelope.translation),
  }
}

export function fetchWord(id: number): Promise<WordDetail> {
  return apiRequest<WordDetail>(`/dictionary/words/${id}`)
}

/**
 * Chi tiết một CÂU.
 *
 * Khoá là chính chuỗi Hán, không phải id — câu không phải mục từ điển nên không
 * có id. Nhờ vậy màn tìm kiếm điều hướng được NGAY khi bấm vào thẻ dịch, thay vì
 * phải gọi API lấy id rồi mới chuyển trang.
 *
 * API trả `data: null` (kèm HTTP 200) khi phân tích không được. Ném ở đây để
 * trang dùng đúng một đường xử lý lỗi của TanStack Query, thay vì thêm một
 * trạng thái "thành công nhưng rỗng" mà mọi chỗ dùng phải nhớ kiểm.
 */
export async function fetchSentence(zh: string): Promise<SentenceDetail> {
  const { data } = await apiRequestWithMeta<SentenceDetail | null>('/dictionary/sentences', {
    query: { zh },
  })

  if (data === null) {
    throw new ApiError('Chưa phân tích được câu này.', 200)
  }

  return data
}
