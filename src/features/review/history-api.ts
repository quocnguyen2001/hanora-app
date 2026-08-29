import { apiRequest, apiRequestWithMeta } from '@/lib/api'
import type { WordSummary } from '@/types/dictionary'
import type { ReviewMode, ReviewSessionMeta } from './api'

/**
 * Phần ĐỌC của tính năng ôn tập, tách khỏi `api.ts`.
 *
 * `api.ts` phục vụ phiên đang làm — dữ liệu chỉ đúng một lần và không cache.
 * Lịch sử là dữ liệu đọc bình thường, có cache, có phân trang. Trộn hai thứ vào
 * một file là mời áp nhầm quy ước cache của bên này cho bên kia.
 */

export interface ReviewAnswer {
  id: number
  user_word_id: number
  mode: ReviewMode
  is_correct: boolean
  /** Lượt làm lại: hiện trong danh sách nhưng KHÔNG tính vào điểm. */
  is_retry: boolean
  answer_raw: string | null
  /** `null` với log cũ hoặc lượt nộp không kèm số đo. */
  duration_ms: number | null
  answered_at: string
  word: {
    id: number
    simplified: string
    pinyin: string
    han_viet: string | null
  }
}

/**
 * Tổng kết một phiên.
 *
 * Dùng chung cho `finishSession` và trang chi tiết phiên — cùng một kiểu vì
 * server trả cùng một payload. Hai hình dạng khác nhau cho cùng thực thể sẽ cho
 * ra hai con số "từ sai" trên hai màn của cùng một phiên.
 */
export interface SessionDetail {
  session: ReviewSessionMeta
  answers: ReviewAnswer[]
}

export interface WeakWord {
  user_word_id: number
  status: string
  review_count: number
  correct_count: number
  wrong_count: number
  accuracy: number
  last_wrong_at: string | null
  next_review_at: string | null
  word: WordSummary
}

export interface WordHistory {
  user_word_id: number
  status: string
  review_count: number
  correct_count: number
  wrong_count: number
  accuracy: number
  last_wrong_at: string | null
  last_reviewed_at: string | null
  next_review_at: string | null
  recent: ReviewAnswer[]
}

export function finishSession(sessionId: number): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/reviews/sessions/${sessionId}/finish`, { method: 'POST' })
}

export async function fetchSessionHistory(
  cursor?: string | null,
): Promise<{ items: ReviewSessionMeta[]; nextCursor: string | null }> {
  const { data, meta } = await apiRequestWithMeta<ReviewSessionMeta[]>('/reviews/sessions', {
    query: { cursor },
  })

  return { items: data, nextCursor: (meta as { next_cursor: string | null }).next_cursor }
}

export function fetchSessionDetail(id: number): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/reviews/sessions/${id}`)
}

/**
 * Từ hay sai — phân trang bằng `page`, KHÔNG phải cursor.
 *
 * Khoá sắp xếp bên server là số lần sai, và nó đổi mỗi lần người dùng trả lời.
 * Kiểu ở đây phản ánh đúng contract chứ không bọc một cursor giả quanh nó.
 */
export async function fetchWeakWords(
  page = 1,
): Promise<{ items: WeakWord[]; nextPage: number | null }> {
  const { data, meta } = await apiRequestWithMeta<WeakWord[]>('/reviews/weak-words', {
    query: { page },
  })

  const { has_more: hasMore } = meta as { has_more: boolean }

  return { items: data, nextPage: hasMore ? page + 1 : null }
}

/** Khoá bằng dictionary word id — cùng id mà route `/words/:id` dùng. */
export function fetchWordHistory(wordId: number): Promise<WordHistory> {
  return apiRequest<WordHistory>(`/reviews/words/${wordId}/history`)
}
