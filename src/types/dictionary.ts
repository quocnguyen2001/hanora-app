/**
 * Kiểu dữ liệu từ điển — khớp hợp đồng response của P6.
 *
 * `han_viet` có thể `null` khi P5 không ghép được âm. FE ẩn hẳn dòng đó.
 * KHÔNG có `saved` hay `user_word_id`: đó là dữ liệu theo user và response từ
 * điển được cache dài hạn (red team C2). Trạng thái đã lưu lấy riêng qua
 * `GET /api/vocabulary/ids`.
 */
export interface WordSummary {
  id: number
  simplified: string
  traditional: string
  pinyin: string
  han_viet: string | null
  definitions_en: string[]
  hsk_level: number | null
}

export interface CharacterBreakdown {
  char: string
  pinyin: string
  han_viet: string | null
}

/**
 * Câu ví dụ Tatoeba.
 *
 * `contributor` và `license` KHÔNG phải metadata trang trí: Tatoeba là CC BY và
 * nghĩa vụ là ghi công tác giả của CHÍNH câu đó. Hiển thị chúng là cách app
 * tuân thủ giấy phép.
 *
 * KHÔNG có pinyin cho câu (D6).
 */
export interface ExampleSentence {
  id: number
  sentence_zh: string
  translation_en: string
  contributor: string | null
  license: string
}

export interface WordDetail extends WordSummary {
  characters: CharacterBreakdown[]
  /** Rỗng là trạng thái HỢP LỆ — FE ẩn hẳn section, không hiện khung trống. */
  examples: ExampleSentence[]
}

export interface SearchMeta {
  page: number
  per_page: number
  total: number
  /** `hv_not_found`: gõ tiếng Việt nhưng không khớp âm Hán-Việt nào. */
  hint: 'hv_not_found' | null
}
