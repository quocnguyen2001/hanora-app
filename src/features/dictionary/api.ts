import { ApiError, apiRequestWithMeta, apiRequest } from '@/lib/api'
import type { SearchModeChoice } from '@/stores/search-mode'
import type {
  SearchMeta,
  SearchTranslation,
  SentenceDetail,
  WordDetail,
  WordIllustration,
  WordIllustrationStatus,
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
 *
 * `signal` là của TanStack Query: gõ tiếp làm query key đổi và request cũ bị
 * hủy ngay tại tầng `fetch`. Thiếu nó thì mỗi nhịp gõ để lại một request treo
 * chạy tới cùng — server vẫn phải dịch bằng AI cho một truy vấn không ai còn
 * nhìn nữa, và trần throttle vẫn bị trừ.
 */
export async function searchWords(
  query: string,
  mode: SearchModeChoice,
  page = 1,
  signal?: AbortSignal,
): Promise<{
  words: WordSummary[]
  meta: SearchMeta
  translation: SearchTranslation | null
}> {
  const envelope = await apiRequestWithMeta<WordSummary[]>('/dictionary/search', {
    query: { q: query, page, ...(mode === null ? {} : { mode }) },
    signal,
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

/**
 * Kiểm hình dạng ảnh trước khi cho nó vào app.
 *
 * Thiếu `url` thì coi như không có ảnh, thay vì render `<img src="undefined">`
 * — cùng tinh thần phòng vệ mà `parseTranslation` đang giữ cho trường `translation`.
 */
function parseIllustration(raw: unknown): WordIllustration | null {
  if (raw === null || typeof raw !== 'object') return null

  const value = raw as Record<string, unknown>
  const url = typeof value.url === 'string' ? value.url.trim() : ''

  if (url === '') return null

  const text = (key: string): string | null => {
    const raw = value[key]

    return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null
  }

  const size = (key: string): number | null => {
    const raw = value[key]

    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
  }

  return {
    url,
    preview_url: text('preview_url'),
    width: size('width'),
    height: size('height'),
    author: text('author'),
    author_url: text('author_url'),
    page_url: text('page_url'),
    source: 'pixabay',
  }
}

/**
 * Ảnh minh hoạ của một từ.
 *
 * KHÔNG ném khi `data === null`, khác hẳn `fetchSentence`: ở đó `null` nghĩa là
 * "phân tích hỏng", còn ở đây `none` nghĩa là "từ này đúng ra không có ảnh" —
 * một câu trả lời THÀNH CÔNG. Ném ở đây sẽ buộc màn chi tiết thêm một nhánh
 * catch cho tình huống bình thường nhất của tính năng này.
 *
 * Trạng thái đọc từ `meta.status`, KHÔNG từ mã HTTP: `apiRequestWithMeta` không
 * phơi ra `response.status` khi thành công, nên 200 và 202 đi vào cùng một đường.
 */
export async function fetchWordIllustration(
  id: number,
): Promise<{ illustration: WordIllustration | null; status: WordIllustrationStatus }> {
  const envelope = await apiRequestWithMeta<unknown>(`/dictionary/words/${id}/illustration`)

  const meta = envelope.meta as { status?: unknown } | undefined
  const raw = typeof meta?.status === 'string' ? meta.status : 'unavailable'
  const status: WordIllustrationStatus = (
    ['ready', 'none', 'pending', 'unavailable'] as const
  ).includes(raw as WordIllustrationStatus)
    ? (raw as WordIllustrationStatus)
    : 'unavailable'

  return { illustration: parseIllustration(envelope.data), status }
}
