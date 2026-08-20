import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { setTokenReader, setUnauthenticatedHandler } from '@/lib/api'
import { createQueryClient } from '@/lib/query-client'
import { clearSession } from '@/lib/session'
import { getToken } from '@/stores/auth'

export function Providers({ children }: { children: ReactNode }) {
  // useState để client sống đúng một lần cho mỗi lần mount, không bị tạo lại
  // ở mỗi render — tạo lại là mất sạch cache.
  const [queryClient] = useState(createQueryClient)

  useEffect(() => {
    /*
     * Nối tầng HTTP với tầng React ở đây, không phải bằng import trực tiếp.
     *
     * Để `lib/api.ts` tự import `QueryClient` và store sẽ tạo phụ thuộc vòng:
     * api → store → api. Tiêm qua setter giữ `lib/api.ts` không biết gì về
     * React, nên nó test được bằng `vi.stubGlobal('fetch')` mà không cần dựng
     * cả cây provider.
     */
    setTokenReader(getToken)
    setUnauthenticatedHandler(() => {
      void clearSession(queryClient)
    })

    return () => {
      setTokenReader(null)
      setUnauthenticatedHandler(null)
    }
  }, [queryClient])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
