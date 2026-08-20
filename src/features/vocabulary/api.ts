import { apiRequest, apiRequestWithMeta } from '@/lib/api'
import type { WordSummary } from '@/types/dictionary'

export interface UserWord {
  id: number
  status: 'new' | 'learning' | 'reviewing' | 'mastered'
  review_count: number
  correct_count: number
  next_review_at: string | null
  created_at: string | null
  word: WordSummary
}

export interface VocabularyPage {
  items: UserWord[]
  nextCursor: string | null
}

export async function fetchVocabulary(params: {
  status?: string
  q?: string
  cursor?: string | null
}): Promise<VocabularyPage> {
  const { data, meta } = await apiRequestWithMeta<UserWord[]>('/vocabulary', {
    query: { status: params.status, q: params.q, cursor: params.cursor },
  })

  return { items: data, nextCursor: (meta as { next_cursor: string | null }).next_cursor }
}

/**
 * Danh sách `word_id` đã lưu.
 *
 * Thay cho trường `saved` đã gỡ khỏi response từ điển ở P6 (C2): response từ
 * điển cache dài hạn và dùng chung cho mọi user, còn endpoint này là
 * `private, no-store`.
 */
export function fetchSavedWordIds(): Promise<number[]> {
  return apiRequest<number[]>('/vocabulary/ids')
}

export function saveWord(wordId: number): Promise<UserWord> {
  return apiRequest<UserWord>('/vocabulary', { method: 'POST', body: { word_id: wordId } })
}

export function removeWord(userWordId: number): Promise<void> {
  return apiRequest<void>(`/vocabulary/${userWordId}`, { method: 'DELETE' })
}
