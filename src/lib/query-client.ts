import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

/**
 * Dữ liệu từ điển gần như bất biến: một từ đã tra hôm nay thì tuần sau vẫn
 * đúng như thế. `staleTime` cao là thứ khiến việc gõ lại một từ đã tra cảm
 * giác tức thì thay vì phải chờ mạng.
 *
 * Dữ liệu theo user — kho từ, phiên ôn — tự đặt `staleTime` riêng ở hook của
 * chính feature đó, đè lên mặc định này.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 60,
        gcTime: 1000 * 60 * 60 * 24,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Thử lại một lỗi 4xx chỉ tốn pin và làm người dùng chờ lâu hơn để
          // nhận đúng lỗi đó. Mất mạng thì đáng thử lại.
          if (error instanceof ApiError && !error.isNetworkError && error.status < 500) {
            return false
          }
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}
