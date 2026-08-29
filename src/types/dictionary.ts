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
  /**
   * Nghĩa tiếng Việt từ CVDICT — `null` cho ~7% từ không có trong nguồn.
   *
   * `null` là trạng thái HỢP LỆ, không phải dữ liệu thiếu: FE ẩn HẲN phần nghĩa
   * Việt cho những từ đó, không hiện khung trống — cùng quy ước mà `han_viet`
   * và `examples` đang dùng.
   *
   * KHÔNG thay thế `definitions_en`. Nghĩa tiếng Việt dịch bằng AI có người rà
   * và tác giả thừa nhận còn sót lỗi, nên dòng tiếng Anh hiển thị cạnh bên là
   * cơ chế đối chiếu duy nhất người học có. Bỏ nó đi là gỡ mất chốt đó.
   */
  definitions_vi: string[] | null
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

/**
 * Bản dịch tiếng Trung của TOÀN BỘ truy vấn, cho truy vấn dạng CÂU.
 *
 * Nằm NGOÀI `data` và đó là bản chất chứ không phải cách đóng gói: một câu dịch
 * không có `id`, không mở được trang chi tiết, không lưu được vào kho từ. Nhét
 * nó vào `data` là buộc mọi chỗ dùng phải đoán phần tử nào bấm được, và làm nút
 * lưu hỏng ở đúng phần tử đầu tiên người dùng nhìn thấy.
 *
 * `null` là trạng thái THƯỜNG GẶP NHẤT — chỉ truy vấn là câu hoặc mệnh đề hoàn
 * chỉnh mới có. `bác sĩ` và `xin chào` không có.
 *
 * Nội dung do máy dịch, không có người rà. Mọi chỗ hiển thị PHẢI gắn nhãn nguồn.
 */
export interface SearchTranslation {
  /** Câu tiếng Trung giản thể. */
  zh: string
  pinyin: string
  /** Truy vấn gốc do model diễn đạt lại; có thể rỗng. */
  vi: string
  source: 'ai'
}

export interface SearchMeta {
  page: number
  per_page: number
  total: number
  /**
   * `hv_not_found`: gõ tiếng Việt mà KHÔNG nhánh nào khớp — không âm Hán-Việt,
   * không nghĩa tiếng Việt.
   *
   * Tên trường giữ nguyên từ P6 nhưng nghĩa đã rộng ra khi thêm nhánh tìm theo
   * nghĩa tiếng Việt. Nó KHÔNG phân biệt được hai lý do, và IM LẶNG khi cầu nối
   * trả về kết quả kém — có kết quả là không có hint, kể cả khi kết quả sai.
   */
  hint: 'hv_not_found' | null
  /**
   * `ai` khi lớp diễn giải AI đã tham gia, `sql` khi kết quả thuần truy vấn SQL.
   *
   * API dập `hint` khi `source === 'ai'`, nên hai trường này không mâu thuẫn
   * nhau: không bao giờ vừa có kết quả AI vừa khuyên người dùng đổi cách gõ.
   */
  source: 'sql' | 'ai'
}

/**
 * Một từ đã tách ra từ câu.
 *
 * `word_id` là lối đi từ câu vào từ điển: bấm vào từ là mở trang chi tiết từ đó.
 *
 * `null` là trạng thái HỢP LỆ và thường gặp — dấu câu, tên riêng, và những cụm
 * không có trong CC-CEDICT đều rơi vào đó. FE hiện chúng như chữ thường, KHÔNG
 * cho bấm; một chip trông bấm được mà bấm không ra gì tệ hơn một chip tĩnh.
 */
export interface SentenceToken {
  zh: string
  pinyin: string
  /** Nghĩa ngắn TRONG NGỮ CẢNH câu này; rỗng với dấu câu. */
  vi: string
  word_id: number | null
}

/**
 * Chi tiết một câu tiếng Trung.
 *
 * Toàn bộ nội dung do AI sinh — không có nguồn, không có người rà. Trang hiển
 * thị PHẢI gắn nhãn, cùng lý do với `SearchTranslation`.
 */
export interface SentenceDetail {
  zh: string
  pinyin: string
  /** Bản dịch tự nhiên. */
  vi: string
  /**
   * Nghĩa ĐEN, dịch sát từng từ theo thứ tự gốc.
   *
   * Nghe ngang là đúng: nó tồn tại để người học thấy tiếng Trung sắp xếp ý khác
   * tiếng Việt ở chỗ nào. `null` khi model không trả về.
   */
  literal_vi: string | null
  /** Rỗng khi chốt chặn phía API loại bỏ bản tách từ sai — FE ẩn hẳn khối đó. */
  tokens: SentenceToken[]
  grammar_notes: string[]
  source: 'ai'
}

/**
 * Trạng thái ảnh minh hoạ, đọc từ `meta.status`.
 *
 * `none` KHÔNG phải lỗi — nó là kết luận "từ này đúng ra không có ảnh". Hư từ
 * và từ trừu tượng chiếm một phần lớn từ điển, nên đây là kết cục thường gặp và
 * hoàn toàn bình thường: màn chi tiết giữ nguyên khung placeholder.
 */
export type WordIllustrationStatus = 'ready' | 'none' | 'pending' | 'unavailable'

/**
 * Ảnh minh hoạ từ Pixabay.
 *
 * `author`, `author_url` và `page_url` KHÔNG phải metadata trang trí — cùng quy
 * ước mà `ExampleSentence.contributor` đang giữ với Tatoeba. ToS Pixabay đòi
 * hiển thị nguồn ảnh cho người dùng; bỏ dòng ghi công là dùng ảnh sai điều khoản.
 */
export interface WordIllustration {
  /**
   * URL ảnh. Đây là trường DUY NHẤT app dùng để render, có chủ đích: API đổi
   * sang tự host ảnh về sau thì chỗ này không phải sửa gì.
   */
  url: string
  /** Bản 150px, đường lui khi bản 640px hỏng. */
  preview_url: string | null
  width: number | null
  height: number | null
  author: string | null
  author_url: string | null
  page_url: string | null
  source: 'pixabay'
}
