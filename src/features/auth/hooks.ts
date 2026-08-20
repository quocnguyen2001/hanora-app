import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'
import { clearSession } from '@/lib/session'
import { useAuthStore } from '@/stores/auth'
import * as authApi from './api'

/** Query key — nơi duy nhất khai báo, theo quy ước của P2. */
export const authKeys = {
  me: ['auth', 'me'] as const,
}

/**
 * Làm mới thông tin user.
 *
 * KHÔNG dùng để quyết định đã đăng nhập hay chưa — sự hiện diện của token trong
 * store mới là tín hiệu đó. Xem `ProtectedRoute`.
 */
export function useMe() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => authApi.me(),
    enabled: token !== null,
    /*
     * KHÔNG retry lỗi mạng ở đây.
     *
     * Ở chế độ máy bay, retry chỉ làm app quay vòng vô ích. Phiên vẫn giữ
     * nguyên vì `ProtectedRoute` gate trên token chứ không trên query này.
     */
    retry: (failureCount, error) =>
      error instanceof ApiError && error.isNetworkError ? false : failureCount < 1,
  })
}

export function useLogin() {
  const setToken = useAuthStore((state) => state.setToken)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      setToken(session.token)
      queryClient.setQueryData(authKeys.me, { user: session.user })
    },
  })
}

export function useRegister() {
  const setToken = useAuthStore((state) => state.setToken)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (session) => {
      setToken(session.token)
      queryClient.setQueryData(authKeys.me, { user: session.user })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      /*
       * Gọi API trước, nhưng KHÔNG để lỗi của nó chặn việc dọn phiên.
       *
       * Người dùng bấm đăng xuất khi đang offline vẫn phải được đăng xuất —
       * nếu không, trên máy dùng chung họ tưởng đã thoát mà dữ liệu vẫn còn.
       */
      await authApi.logout().catch(() => undefined)
      await clearSession(queryClient)
    },
  })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword })
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword })
}
