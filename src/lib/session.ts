import type { QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { useRecentSearches } from '@/stores/recent-searches'

/**
 * Xóa phiên ở CẢ BỐN TẦNG.
 *
 * Xóa token và query cache là chưa đủ. Service worker giữ response
 * `GET /api/vocabulary` trong Cache Storage, keyed theo URL chứ không theo tài
 * khoản. Bỏ sót bước đó thì trên máy dùng chung, tài khoản B đăng nhập rồi bật
 * chế độ máy bay sẽ thấy **kho từ của tài khoản A** (red team C2).
 *
 * Tầng thứ tư là lịch sử tìm kiếm trong `localStorage`. Nó luôn là dữ liệu theo
 * người dùng, nhưng trở nên nhạy cảm hơn hẳn kể từ khi tìm được bằng nghĩa
 * tiếng Việt: trước đây rò ra một danh sách chữ Hán, giờ rò ra danh sách cụm từ
 * tiếng Việt tự do của tài khoản trước.
 *
 * Gọi ở đúng hai chỗ: người dùng bấm đăng xuất, và khi nhận HTTP 401 thật.
 * KHÔNG gọi khi lỗi mạng — xem `lib/api.ts`.
 */
export async function clearSession(queryClient?: QueryClient): Promise<void> {
  useAuthStore.getState().clearToken()
  useRecentSearches.getState().clear()

  queryClient?.clear()

  if (typeof caches === 'undefined') return

  const keys = await caches.keys()

  await Promise.all(keys.map((key) => caches.delete(key)))
}
