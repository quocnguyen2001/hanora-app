import { apiRequest, apiRequestWithMeta } from '@/lib/api'

/** Một chủ đề trên lưới. */
export interface Topic {
  slug: string
  name: string
  emoji: string
  word_count: number
  /**
   * Số từ đã XỬ LÝ — đã lưu HOẶC đã bỏ qua, đếm một lần.
   *
   * MỘT con số do API tính, không phải hai để app cộng: một từ có thể vừa được
   * lưu vừa bị bỏ qua (bỏ qua ở chủ đề này rồi lưu từ màn Tìm kiếm), và cộng
   * hai bộ đếm sẽ cho `80/78` với thanh tiến độ tràn.
   */
  processed_count: number
  /** Chỉ để hiện "đã lưu bao nhiêu". KHÔNG dùng cho tiến độ. */
  learned_count: number
  /**
   * Vòng đời của chủ đề TỰ TẠO. Chủ đề gốc luôn `ready`.
   *
   * `failed` là trạng thái hạng nhất: không có nó thì một job chết trông giống
   * hệt một chủ đề rỗng, và người dùng không biết là nên xoá đi tạo lại.
   */
  status: 'ready' | 'generating' | 'failed'
  is_custom: boolean
  failed_reason: string | null
}

/**
 * Một từ trong bộ từ của chủ đề.
 *
 * KHÔNG mở rộng `WordSummary`: ở đây nghĩa là MỘT dòng đã dọn
 * (`definition_vi`), không phải cả mảng `definitions_vi`. Thẻ học hiện một dòng,
 * và trả cả mảng là 24-32KB thay vì ~14KB cho một bộ 80 từ.
 */
export interface TopicWord {
  id: number
  simplified: string
  traditional: string
  pinyin: string
  han_viet: string | null
  definition_vi: string | null
  /** Dòng tiếng Anh làm chốt đối chiếu — nghĩa Việt CVDICT còn sót lỗi. */
  definition_en: string | null
  hsk_level: number | null
  /** Thứ tự trong chủ đề, thông dụng nhất trước. */
  rank: number
}

export interface TopicWordsPage {
  words: TopicWord[]
  /** Để phát hiện bộ từ đã đổi sau khi maintainer mở rộng chủ đề. */
  wordCount: number
}

export function fetchTopics(): Promise<Topic[]> {
  return apiRequest<Topic[]>('/topics')
}

export async function fetchTopicWords(slug: string): Promise<TopicWordsPage> {
  const { data, meta } = await apiRequestWithMeta<TopicWord[]>(`/topics/${slug}/words`)

  return { words: data, wordCount: (meta as { word_count: number }).word_count }
}

/**
 * `word_id` KHÔNG đưa vào phiên học nữa.
 *
 * Hợp của hai nguồn phía API: từ đã bấm "Đã biết rồi" VÀ từ đã lưu rồi tự xoá
 * khỏi kho. App không cần biết sự khác biệt.
 */
export function fetchSkippedWordIds(): Promise<number[]> {
  return apiRequest<number[]>('/topics/skips')
}

export function skipWord(wordId: number): Promise<{ word_id: number }> {
  return apiRequest<{ word_id: number }>('/topics/skips', {
    method: 'POST',
    body: { word_id: wordId },
  })
}

/**
 * Tạo chủ đề mới.
 *
 * Trả `202`: chủ đề đã tồn tại nhưng CHƯA dùng được — job sinh từ mất 16-25
 * giây. App poll `GET /topics` cho tới khi nó rời trạng thái `generating`.
 */
export function createTopic(input: { name: string; emoji?: string }): Promise<Topic> {
  return apiRequest<Topic>('/topics', { method: 'POST', body: input })
}

export function deleteTopic(slug: string): Promise<void> {
  return apiRequest<void>(`/topics/${slug}`, { method: 'DELETE' })
}
