import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ReviewMode } from '@/features/review/api'

/**
 * Chỉ state UI của phiên ôn — không nhân bản dữ liệu server.
 *
 * `answeredOnce` là tập `user_word_id` đã nộp ít nhất một lần TRONG PHIÊN NÀY.
 * Nó quyết định cờ `is_retry` cho lần nộp sau, và cờ đó là thứ giữ cho hình
 * phạt SRS không bị xóa sạch bởi thao tác sai-rồi-sửa (P14, red team H3).
 */
interface ReviewState {
  /** Mode lần trước, nhớ lại để không phải chọn lại mỗi lần vào. */
  lastMode: ReviewMode
  setLastMode: (mode: ReviewMode) => void

  answeredOnce: number[]
  markAnswered: (userWordId: number) => void
  isRetry: (userWordId: number) => boolean
  resetSession: () => void
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      lastMode: 'mcq',
      setLastMode: (mode) => set({ lastMode: mode }),

      answeredOnce: [],
      markAnswered: (userWordId) =>
        set((state) =>
          state.answeredOnce.includes(userWordId)
            ? state
            : { answeredOnce: [...state.answeredOnce, userWordId] },
        ),
      isRetry: (userWordId) => get().answeredOnce.includes(userWordId),
      resetSession: () => set({ answeredOnce: [] }),
    }),
    {
      name: 'hanora.review',
      // Chỉ nhớ mode; tiến độ phiên KHÔNG nên sống qua lần tải lại trang —
      // phiên cũ đã hết hạn và thẻ tới hạn đã khác.
      partialize: (state) => ({ lastMode: state.lastMode }),
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' && window.localStorage
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
)
