import { apiRequest } from '@/lib/api'

export type ReviewMode = 'mcq' | 'typing'

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

export interface ReviewSession {
  mode: ReviewMode
  items: ReviewItem[]
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
  is_retry: boolean
}

export function fetchSession(mode: ReviewMode, limit = 10): Promise<ReviewSession> {
  return apiRequest<ReviewSession>('/reviews/session', { query: { mode, limit } })
}

export function submitAnswer(input: {
  user_word_id: number
  mode: ReviewMode
  answer_word_id?: number
  answer?: string
  is_retry: boolean
}): Promise<AnswerResult> {
  return apiRequest<AnswerResult>('/reviews/answers', { method: 'POST', body: input })
}

export function isMcqItem(item: ReviewItem): item is McqItem {
  return 'options' in item
}
