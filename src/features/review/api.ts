import { apiRequest } from '@/lib/api'

export type ReviewMode = 'mcq' | 'typing'

/** Nguồn thẻ: theo lịch SRS, hoặc những từ hay sai bất kể lịch. */
export type ReviewSource = 'due' | 'weak'

export type ReviewGrade = 'excellent' | 'good' | 'fair' | 'needs_work'

/**
 * Vì sao phiên rỗng.
 *
 * Hai lý do cần hai câu trả lời khác nhau: `not_enough_options` nghĩa là người
 * dùng CÓ từ để ôn nhưng kho quá mỏng để dựng câu trắc nghiệm — báo "chưa có từ
 * nào" ở đó là nói sai sự thật, và gợi ý đúng là chuyển sang mode Gõ lại.
 */
export type EmptyReason = 'no_words' | 'not_enough_options'

export interface McqOption {
  word_id: number
  text: string
}

export interface McqItem {
  user_word_id: number
  word: { id: number; simplified: string; pinyin: string }
  options: McqOption[]
}

export interface TypingItem {
  user_word_id: number
  prompt_han_viet: string
  hint: { char_count: number }
}

export type ReviewItem = McqItem | TypingItem

/** Bản ghi phiên ở server — nguồn của điểm và tiến độ. */
export interface ReviewSessionMeta {
  id: number
  mode: ReviewMode
  source: ReviewSource
  planned_count: number
  answered_count: number
  correct_count: number
  score: number | null
  /** `null` khi chưa trả lời câu nào: phiên đó không có xếp loại. */
  grade: ReviewGrade | null
  duration_seconds: number | null
  started_at: string
  finished_at: string | null
}

export interface StartedSession {
  /** `null` khi không có thẻ nào — KHÔNG phải lỗi, và không bản ghi nào được tạo. */
  session: ReviewSessionMeta | null
  items: ReviewItem[]
  empty_reason: EmptyReason | null
}

export interface AnswerResult {
  correct: boolean
  correct_answer: {
    word_id: number
    simplified: string
    pinyin: string
    han_viet: string | null
  }
  next_review_at: string | null
  status: string
  /** Do SERVER quyết, không phải client khai. */
  is_retry: boolean
  /** Tiến độ mới nhất — dùng thẳng cho thanh tiến độ, không gọi thêm. */
  session: ReviewSessionMeta
}

export function startSession(input: {
  mode: ReviewMode
  source: ReviewSource
  limit: number
}): Promise<StartedSession> {
  return apiRequest<StartedSession>('/reviews/sessions', { method: 'POST', body: input })
}

/**
 * Nộp một lượt trả lời.
 *
 * KHÔNG có `is_retry`: cờ đó chi phối cả hình phạt SRS lẫn mẫu số của điểm, nên
 * server suy nó từ log của chính phiên. Client khai được nghĩa là client tự
 * chấm điểm mình.
 */
export function submitAnswer(input: {
  user_word_id: number
  review_session_id: number
  mode: ReviewMode
  answer_word_id?: number
  answer?: string
}): Promise<AnswerResult> {
  return apiRequest<AnswerResult>('/reviews/answers', { method: 'POST', body: input })
}

export function isMcqItem(item: ReviewItem): item is McqItem {
  return 'options' in item
}
