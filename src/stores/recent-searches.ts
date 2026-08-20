import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const MAX_ITEMS = 10

/**
 * Lịch sử tìm kiếm — state CLIENT, đúng chỗ cho Zustand.
 *
 * Không phải dữ liệu server nên không nằm ở TanStack Query (quy ước P2). Và cố
 * tình không đồng bộ lên server: nó là tiện ích cục bộ của thiết bị, đồng bộ nó
 * là thêm một endpoint, một bảng và một bài toán quyền riêng tư mà chưa ai cần.
 */
interface RecentSearchesState {
  items: string[]
  add: (query: string) => void
  clear: () => void
}

export const useRecentSearches = create<RecentSearchesState>()(
  persist(
    (set) => ({
      items: [],
      add: (query) =>
        set((state) => {
          const trimmed = query.trim()

          if (trimmed === '') return state

          // Bỏ bản trùng rồi đưa lên đầu — tra lại một từ không nên tạo hai dòng.
          const next = [trimmed, ...state.items.filter((item) => item !== trimmed)]

          return { items: next.slice(0, MAX_ITEMS) }
        }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'hanora.recent-searches',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' && window.localStorage
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
)
