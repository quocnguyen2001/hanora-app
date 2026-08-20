import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * `window.localStorage`, KHÔNG phải `localStorage` trần.
 *
 * Node 26 có sẵn một global `localStorage` của riêng nó, và nó bị tắt nếu không
 * chạy kèm `--localstorage-file`. Global đó che mất bản của jsdom, nên
 * `localStorage` trần trong test là `undefined` và zustand persist ném lỗi ngay
 * ở `setItem`. Trên trình duyệt hai đường dẫn là một; nói rõ `window.` khiến nó
 * đúng ở cả hai nơi.
 */
function domStorage(): Storage {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }

  // Không có storage (SSR, hoặc trình duyệt chặn) thì phiên chỉ sống trong RAM
  // thay vì làm nổ cả app. Người dùng phải đăng nhập lại sau khi tải lại trang,
  // nhưng app vẫn chạy.
  const memory = new Map<string, string>()

  return {
    get length() {
      return memory.size
    },
    key: (index: number) => [...memory.keys()][index] ?? null,
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
    clear: () => memory.clear(),
  }
}

/**
 * Phiên đăng nhập.
 *
 * CHỈ token nằm ở đây. Thông tin user lấy qua `useMe()` — nhân bản dữ liệu
 * server vào store là tạo ra hai nguồn sự thật rồi phải tự đồng bộ chúng.
 *
 * Token nằm trong `localStorage`, chịu rủi ro XSS. Đánh đổi đó chỉ đứng vững
 * khi có đủ ba thứ (xem P9): token hết hạn sau 90 ngày, kỷ luật render (không
 * `dangerouslySetInnerHTML`, không render HTML thô từ API), và CSP đặt ở nginx
 * tại P20. Bỏ CSP thì lý do chấp nhận `localStorage` không còn.
 */
interface AuthState {
  token: string | null
  setToken: (token: string) => void
  clearToken: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null }),
    }),
    {
      name: 'hanora.auth',
      storage: createJSONStorage(domStorage),
    },
  ),
)

/** Đọc token ngoài React — `lib/api.ts` cần nó ở mỗi request. */
export function getToken(): string | null {
  return useAuthStore.getState().token
}
