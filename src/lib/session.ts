import type { QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'

/**
 * Xóa phiên ở CẢ BA TẦNG.
 *
 * Xóa token và query cache là chưa đủ. Service worker giữ response
 * `GET /api/vocabulary` trong Cache Storage, keyed theo URL chứ không theo tài
 * khoản. Bỏ sót bước thứ ba thì trên máy dùng chung, tài khoản B đăng nhập rồi
 * bật chế độ máy bay sẽ thấy **kho từ của tài khoản A** (red team C2).
 *
 * Gọi ở đúng hai chỗ: người dùng bấm đăng xuất, và khi nhận HTTP 401 thật.
 * KHÔNG gọi khi lỗi mạng — xem `lib/api.ts`.
 */
export async function clearSession(queryClient?: QueryClient): Promise<void> {
  useAuthStore.getState().clearToken()

  queryClient?.clear()

  if (typeof caches === 'undefined') return

  const keys = await caches.keys()

  await Promise.all(keys.map((key) => caches.delete(key)))
}
