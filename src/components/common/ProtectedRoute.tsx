import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/auth'

/**
 * Cổng xác thực — gate trên TOKEN trong store, không phải trên kết quả `useMe()`.
 *
 * Đây là red team C5, và nó là loại lỗi không bao giờ lộ ra trên localhost.
 *
 * Nếu lấy `useMe()` làm nguồn trạng thái thì ở chế độ máy bay: `me` fail ở tầng
 * mạng → query trả lỗi → route đá về `/login` → kho từ đã cache trong service
 * worker KHÔNG BAO GIỜ được yêu cầu → tiêu chí offline của MVP thất bại. Và vì
 * localhost không bao giờ offline, lỗi này chỉ lộ khi thử trên thiết bị thật.
 *
 * Chỉ HTTP 401 thật mới xóa phiên, và việc đó do `lib/api.ts` làm.
 */
export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token)
  const location = useLocation()

  if (token === null) {
    // Nhớ chỗ người dùng định tới để sau khi đăng nhập quay lại đúng đó, thay
    // vì luôn đổ về màn tìm kiếm.
    return (
      <Navigate to="/login" replace state={{ redirect: location.pathname + location.search }} />
    )
  }

  return <Outlet />
}
