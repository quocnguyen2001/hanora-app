import { ApiError, apiRequestWithMeta, apiRequest } from '@/lib/api'
import type { SearchModeChoice } from '@/stores/search-mode'
import type {
  CharacterBreakdown,
  CharacterStrokes,
  ExampleTranslation,
  ExampleTranslationStatus,
  MeasureWord,
  RelatedWord,
  SearchMeta,
  SearchTranslation,
  SentenceDetail,
  WordDetail,
  WordEnrichment,
  WordEnrichmentStatus,
  WordIllustration,
  WordIllustrationStatus,
  WordSense,
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
 *
 * `refine` là người dùng nói "kết quả không chuẩn": nó gửi `refine=ai` để API bỏ
 * qua cổng `SearchWeakness` và luôn hỏi AI. Cũng bỏ hẳn khỏi query string khi
 * `false`, cùng lý do `mode` làm vậy — `refine=` rỗng trượt `Rule::in` và trả 422.
 *
 * Đuôi chữ ký là OBJECT chứ không phải thêm tham số vị trí: chèn `refine` vào
 * giữa sẽ khiến `searchWords(q, mode, 1, signal)` đọc `1` thành `refine`, và bốn
 * tham số vị trí liên tiếp là thứ dễ nối sai khi bảo trì.
 */
export async function searchWords(
  query: string,
  mode: SearchModeChoice,
  {
    page = 1,
    signal,
    refine = false,
  }: { page?: number; signal?: AbortSignal; refine?: boolean } = {},
): Promise<{
  words: WordSummary[]
  meta: SearchMeta
  translation: SearchTranslation | null
}> {
  const envelope = await apiRequestWithMeta<WordSummary[]>('/dictionary/search', {
    query: {
      q: query,
      page,
      ...(mode === null ? {} : { mode }),
      ...(refine ? { refine: 'ai' } : {}),
    },
    signal,
  })

  return {
    // Chuẩn hoá `measure_words` vì cùng lý do `fetchWord` làm vậy: bucket
    // service worker của tìm kiếm sống 24 giờ và có thể trả bản trước khi
    // trường này tồn tại.
    words: envelope.data.map((word) => ({
      ...word,
      measure_words: parseMeasureWords(word.measure_words),
    })),
    meta: envelope.meta as SearchMeta,
    translation: parseTranslation(envelope.translation),
  }
}

/**
 * Chi tiết một từ.
 *
 * `measure_words` được CHUẨN HOÁ chứ không tin thẳng, và đây không phải phòng
 * xa thừa: `/words/{id}` nằm trong bucket service worker sống 30 ngày, nên mọi
 * người dùng đã mở một từ trước khi trường này tồn tại sẽ nhận lại bản cũ KHÔNG
 * có nó. Kiểu khai là `MeasureWord[]`, nên `undefined` lọt qua sẽ làm
 * `.length` ném ngay giữa hero.
 */
export async function fetchWord(id: number): Promise<WordDetail> {
  const word = await apiRequest<WordDetail>(`/dictionary/words/${id}`)

  return {
    ...word,
    measure_words: parseMeasureWords(word.measure_words),
    characters: parseCharacters(word.characters),
  }
}

/**
 * Hán tự của một từ.
 *
 * Điền `null` cho MỌI thuộc tính vắng thay vì để trường không tồn tại: response
 * cũ trong cache service worker (30 ngày) chỉ có `char`/`pinyin`/`han_viet`, và
 * component đọc `character.stroke_count` trên một object thiếu khoá sẽ nhận
 * `undefined` — thứ mà `!== null` cho là có giá trị và render ra "undefined".
 */
function parseCharacters(raw: unknown): CharacterBreakdown[] {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((item): CharacterBreakdown[] => {
    if (item === null || typeof item !== 'object') return []

    const value = item as Record<string, unknown>
    const char = text(value.char)
    const pinyin = text(value.pinyin)

    if (char === null || pinyin === null) return []

    const strokeNames = Array.isArray(value.stroke_names)
      ? value.stroke_names.filter((s): s is string => typeof s === 'string' && s !== '')
      : null

    const strokeCount = value.stroke_count

    return [
      {
        char,
        pinyin,
        han_viet: text(value.han_viet),
        radical: text(value.radical),
        radical_han_viet: text(value.radical_han_viet),
        stroke_count:
          typeof strokeCount === 'number' && Number.isFinite(strokeCount) && strokeCount > 0
            ? strokeCount
            : null,
        decomposition: text(value.decomposition),
        etymology_type: text(value.etymology_type),
        // Mảng rỗng về `null`: "0 nét" là một khẳng định sai, còn `null` là
        // "không biết" và UI ẩn dòng.
        stroke_names: strokeNames !== null && strokeNames.length > 0 ? strokeNames : null,
      },
    ]
  })
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
 * Nghĩa tiếng Việt của các câu ví dụ thuộc một từ.
 *
 * `data` LUÔN là mảng, kể cả khi `status` là `pending` hay `unavailable`: một từ
 * có thể dịch xong 2 câu rồi cạn lượt ở câu thứ ba, và vứt cả lô khi đó là vứt
 * đi hai bản dịch đã có.
 *
 * KHÔNG ném khi chưa có gì — khác `fetchSentence`. Ở đó `null` nghĩa là "phân
 * tích hỏng"; ở đây "chưa dịch xong" là một câu trả lời THÀNH CÔNG, và câu ví dụ
 * vẫn đọc được bằng bản tiếng Anh.
 */
export async function fetchExampleTranslations(
  wordId: number,
): Promise<{ translations: ExampleTranslation[]; status: ExampleTranslationStatus }> {
  const envelope = await apiRequestWithMeta<unknown>(
    `/dictionary/words/${wordId}/example-translations`,
  )

  const meta = envelope.meta as { status?: unknown } | undefined
  const raw = typeof meta?.status === 'string' ? meta.status : 'unavailable'
  const status: ExampleTranslationStatus = (['ready', 'pending', 'unavailable'] as const).includes(
    raw as ExampleTranslationStatus,
  )
    ? (raw as ExampleTranslationStatus)
    : 'unavailable'

  /*
   * Kiểm từng mục thay vì tin cả mảng, cùng tinh thần phòng vệ mà
   * `parseIllustration` giữ: một mục hỏng chỉ được làm mất đúng dòng tiếng Việt
   * của nó, không được kéo theo cả khối ví dụ.
   */
  const translations = Array.isArray(envelope.data)
    ? envelope.data.flatMap((item): ExampleTranslation[] => {
        if (item === null || typeof item !== 'object') return []

        const value = item as Record<string, unknown>
        const text = typeof value.translation_vi === 'string' ? value.translation_vi.trim() : ''

        if (typeof value.id !== 'number' || text === '') return []

        return [{ id: value.id, translation_vi: text }]
      })
    : []

  return { translations, status }
}

/** Chuỗi đã trim, hoặc `null` khi trường vắng / rỗng / sai kiểu. */
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/**
 * Lượng từ của một mục từ.
 *
 * Bỏ mục thiếu `simplified` thay vì ném — cùng tinh thần phòng vệ mà
 * `parseIllustration` đang giữ. `traditional` vắng thì rơi về `simplified`, đúng
 * quy ước mà chính CC-CEDICT dùng khi hai dạng trùng nhau.
 */
export function parseMeasureWords(raw: unknown): MeasureWord[] {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((item): MeasureWord[] => {
    if (item === null || typeof item !== 'object') return []

    const value = item as Record<string, unknown>
    const simplified = text(value.simplified)

    if (simplified === null) return []

    return [
      {
        simplified,
        traditional: text(value.traditional) ?? simplified,
        pinyin: text(value.pinyin) ?? '',
      },
    ]
  })
}

/**
 * Nghĩa đã phân loại theo từ loại.
 *
 * Bỏ mục thiếu `pos` hoặc `vi` thay vì ném: cùng tinh thần phòng vệ mà
 * `parseIllustration` và lô dịch câu ví dụ đang giữ — một mục hỏng chỉ được làm
 * mất chính nó, không kéo theo cả khối.
 */
function parseSenses(raw: unknown): WordSense[] {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((item): WordSense[] => {
    if (item === null || typeof item !== 'object') return []

    const value = item as Record<string, unknown>
    const pos = text(value.pos)
    const vi = text(value.vi)

    if (pos === null || vi === null) return []

    return [{ pos, vi, note: text(value.note) }]
  })
}

/**
 * Từ ghép / thành ngữ.
 *
 * `word_id` chỉ được nhận khi nó là số dương thật. API trả `null` cho mục không
 * tra ngược được, và bản ghi làm giàu cũ không có trường này chút nào — cả hai
 * đều rơi về `null`, và UI hiện mục đó tĩnh.
 */
function parseRelatedWords(raw: unknown): RelatedWord[] {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((item): RelatedWord[] => {
    if (item === null || typeof item !== 'object') return []

    const value = item as Record<string, unknown>
    const simplified = text(value.simplified)

    if (simplified === null) return []

    const id = value.word_id

    return [
      {
        simplified,
        pinyin: text(value.pinyin) ?? '',
        vi: text(value.vi) ?? '',
        word_id: typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null,
      },
    ]
  })
}

/**
 * Nội dung làm giàu của một từ.
 *
 * KHÔNG ném khi `data === null` — giống `fetchWordIllustration`, khác
 * `fetchSentence`. `unavailable` nghĩa là "sẽ không có", một câu trả lời THÀNH
 * CÔNG mà màn hình xử lý bằng cách ẩn khối, không phải bằng một nhánh catch.
 *
 * Trạng thái đọc từ `meta.status`, KHÔNG từ mã HTTP: `apiRequestWithMeta` không
 * phơi ra `response.status` khi thành công, nên 200 và 202 đi vào cùng một đường.
 */
export async function fetchWordEnrichment(
  wordId: number,
): Promise<{ enrichment: WordEnrichment | null; status: WordEnrichmentStatus }> {
  const envelope = await apiRequestWithMeta<unknown>(`/dictionary/words/${wordId}/enrichment`)

  const meta = envelope.meta as { status?: unknown } | undefined
  const raw = typeof meta?.status === 'string' ? meta.status : 'unavailable'
  const status: WordEnrichmentStatus = (['ready', 'pending', 'unavailable'] as const).includes(
    raw as WordEnrichmentStatus,
  )
    ? (raw as WordEnrichmentStatus)
    : 'unavailable'

  const data = envelope.data

  if (data === null || typeof data !== 'object') {
    return { enrichment: null, status }
  }

  const value = data as Record<string, unknown>

  return {
    enrichment: {
      senses: parseSenses(value.senses),
      related_words: parseRelatedWords(value.related_words),
      idioms: parseRelatedWords(value.idioms),
      usage_note: text(value.usage_note),
      model: text(value.model),
    },
    status,
  }
}

/**
 * Hình học nét của một chữ.
 *
 * Trả `null` cho 404 thay vì ném: "chữ này không có dữ liệu nét" là một câu trả
 * lời — 2.763/9.574 chữ rơi vào đó, phần lớn là phồn thể — chứ không phải lỗi.
 * Sheet tập viết hiện thông báo và cho đóng, thay vì màn hình lỗi.
 *
 * Mọi mã lỗi KHÁC vẫn ném: mất mạng hay 500 là chuyện khác hẳn, và nuốt chúng
 * thành "chữ này không có nét" là nói dối người dùng.
 */
export async function fetchCharacterStrokes(char: string): Promise<CharacterStrokes | null> {
  try {
    const data = await apiRequest<CharacterStrokes>(
      `/dictionary/characters/${encodeURIComponent(char)}/strokes`,
    )

    return Array.isArray(data.strokes) && data.strokes.length > 0 ? data : null
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null

    throw error
  }
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
