import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ReviewMode, ReviewSource } from '@/features/review/api'

/**
 * Chỉ TÙY CHỌN của màn ôn tập — không state phiên, không dữ liệu server.
 *
 * Trước đây store còn giữ `answeredOnce` (tập từ đã nộp trong phiên) để tính cờ
 * `is_retry`. Cờ đó giờ do server suy từ log của chính phiên, và việc bỏ nó đi
 * cũng bỏ luôn một lớp bug: `answeredOnce` chỉ được xoá trong `pickMode`, nên
 * mọi đường tạo phiên khác — "Ôn lại từ sai", "Bắt đầu phiên mới" — đều thừa
 * hưởng state của phiên trước và đánh dấu cả phiên mới là làm lại.
 *
 * Cũng KHÔNG giữ `sessionId`: `ReviewSession` đã có phiên trong state của nó.
 * Một id cấp module sống lâu hơn thứ nó định danh, và sống qua cả `clearSession()`
 * khi đổi tài khoản.
 */
interface ReviewState {
  /** Nhớ lại để không phải chọn lại mỗi lần vào. */
  lastMode: ReviewMode
  lastSource: ReviewSource
  lastLimit: number

  setLastMode: (mode: ReviewMode) => void
  setLastSource: (source: ReviewSource) => void
  setLastLimit: (limit: number) => void
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set) => ({
      lastMode: 'mcq',
      lastSource: 'due',
      lastLimit: 10,

      setLastMode: (mode) => set({ lastMode: mode }),
      setLastSource: (source) => set({ lastSource: source }),
      setLastLimit: (limit) => set({ lastLimit: limit }),
    }),
    {
      name: 'hanora.review',
      // Tùy chọn thì nhớ được; tiến độ phiên thì không — phiên cũ đã bị server
      // tự chốt khi người dùng bắt đầu phiên mới.
      partialize: (state) => ({
        lastMode: state.lastMode,
        lastSource: state.lastSource,
        lastLimit: state.lastLimit,
      }),
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' && window.localStorage
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
)
