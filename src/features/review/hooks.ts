import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { vocabularyKeys } from '@/features/vocabulary/hooks'
import * as reviewApi from './api'
import * as historyApi from './history-api'

export const reviewKeys = {
  history: ['reviews', 'history'] as const,
  /**
   * `session-detail`, không phải `session`.
   *
   * Key cũ là `['reviews', 'session', mode]`; một key mới `['reviews', 'session', id]`
   * sẽ cùng tiền tố với nó, và một `invalidateQueries({ queryKey: ['reviews', 'session'] })`
   * sẽ quét cả hai.
   */
  sessionDetail: (id: number) => ['reviews', 'session-detail', id] as const,
  weakWords: ['reviews', 'weak-words'] as const,
  wordHistory: (wordId: number) => ['reviews', 'word-history', wordId] as const,
}

/**
 * Mở phiên.
 *
 * Là MUTATION chứ không query, vì endpoint ghi một bản ghi vào DB. Hệ quả: nó
 * KHÔNG được dedupe như `useQuery`, nên chỗ gọi phải tự đảm bảo chỉ bắn một lần
 * — xem cờ `starting` ở `ReviewPage`.
 */
export function useStartSession() {
  return useMutation({ mutationFn: reviewApi.startSession })
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reviewApi.submitAnswer,
    onSuccess: (result) => {
      /*
       * `result.is_retry` — do SERVER quyết, không phải `variables.is_retry`.
       * Chỉ lượt ĐẦU mới đổi lịch ôn, trạng thái từ và số lần sai.
       */
      if (!result.is_retry) {
        void queryClient.invalidateQueries({ queryKey: ['vocabulary', 'list'] })
        void queryClient.invalidateQueries({ queryKey: vocabularyKeys.ids })
        void queryClient.invalidateQueries({ queryKey: ['stats'] })
        void queryClient.invalidateQueries({ queryKey: reviewKeys.weakWords })
        void queryClient.invalidateQueries({ queryKey: ['reviews', 'word-history'] })
      }
    },
  })
}

export function useFinishSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: historyApi.finishSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.history })
      void queryClient.invalidateQueries({ queryKey: reviewKeys.weakWords })
      void queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useSessionHistory() {
  return useInfiniteQuery({
    queryKey: reviewKeys.history,
    queryFn: ({ pageParam }) => historyApi.fetchSessionHistory(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

/**
 * `enabled` để một id không hợp lệ trên URL không sinh request.
 *
 * Hook không gọi có điều kiện được, nên guard ở trang chỉ chặn phần RENDER —
 * thiếu cờ này thì `/review/history/abc` vẫn bắn một lượt tới
 * `/reviews/sessions/0`.
 */
export function useSessionDetail(id: number, enabled = true) {
  return useQuery({
    queryKey: reviewKeys.sessionDetail(id),
    queryFn: () => historyApi.fetchSessionDetail(id),
    enabled,
    // Phiên đã chốt không đổi nữa.
    staleTime: Infinity,
  })
}

export function useWeakWords() {
  return useInfiniteQuery({
    queryKey: reviewKeys.weakWords,
    queryFn: ({ pageParam }) => historyApi.fetchWeakWords(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  })
}

/**
 * Lịch sử ôn của một từ.
 *
 * `enabled` theo trạng thái đã lưu: từ chưa lưu trả 404, và gọi nó chỉ để nhận
 * 404 là rác trong console lẫn một request thừa trên mọi lần mở màn chi tiết.
 */
export function useWordHistory(wordId: number, enabled: boolean) {
  return useQuery({
    queryKey: reviewKeys.wordHistory(wordId),
    queryFn: () => historyApi.fetchWordHistory(wordId),
    enabled,
    staleTime: 30_000,
  })
}
