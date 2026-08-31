import { parseStreakDelta, type StreakDelta } from '@/features/streak/api'
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

/**
 * Lưu một từ, và nhận về trạng thái chuỗi ngày kèm theo.
 *
 * `streak` là trường CẤP ENVELOPE (cạnh `data`), cùng chỗ `/dictionary/search`
 * đặt `translation` — nên phải dùng `apiRequestWithMeta`, `apiRequest` sẽ bóc
 * mất nó.
 *
 * Trả kèm thay vì để client hỏi lại là điều kiện để chip trên header nhích được
 * giữa một phiên học chủ đề: màn đó cố ý không invalidate gì sau mỗi thẻ vì
 * ngân sách 60 request/phút.
 *
 * `streak` là optional vì một API cũ hơn có thể không trả nó, và vì
 * `parseStreakDelta` trả `undefined` khi hình dạng sai. KHÔNG phải vì cache:
 * response POST không bao giờ được service worker cache, và `api.ts` chặn thẳng
 * mọi lượt ghi khi ngoại tuyến.
 */
export async function saveWord(wordId: number): Promise<{ word: UserWord; streak?: StreakDelta }> {
  const envelope = await apiRequestWithMeta<UserWord>('/vocabulary', {
    method: 'POST',
    body: { word_id: wordId },
  })

  return { word: envelope.data, streak: parseStreakDelta(envelope.streak) }
}

export function removeWord(userWordId: number): Promise<void> {
  return apiRequest<void>(`/vocabulary/${userWordId}`, { method: 'DELETE' })
}
