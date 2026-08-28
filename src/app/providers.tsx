import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { setTokenReader, setUnauthenticatedHandler } from '@/lib/api'
import { applyDisplay, watchSystemTheme } from '@/lib/display-theme'
import { createQueryClient } from '@/lib/query-client'
import { clearSession } from '@/lib/session'
import { getToken } from '@/stores/auth'
import { useShallow } from 'zustand/react/shallow'
import { selectDisplaySettings, useDisplay } from '@/stores/display'

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

  /*
   * Áp tùy chỉnh hiển thị ở ĐÚNG MỘT chỗ, không rải trong từng màn.
   *
   * Script inline trong `index.html` đã áp giá trị này trước khi vẽ khung đầu
   * tiên, nên lần chạy này thường không đổi gì cả. Nó tồn tại để bắt những lần
   * SAU: người dùng đổi lựa chọn ở màn Settings, hoặc `zustand/persist` nạp lại
   * state từ localStorage.
   */
  // `useShallow` là BẮT BUỘC ở đây: `selectDisplaySettings` dựng một object mới
  // mỗi lần chạy, và zustand v5 so sánh bằng `Object.is`. Thiếu nó thì mỗi render
  // sinh ra một tham chiếu mới → effect chạy lại → render lại, lặp vô hạn.
  const display = useDisplay(useShallow(selectDisplaySettings))

  useEffect(() => {
    applyDisplay(display)
  }, [display])

  /*
   * Chỉ theo dõi hệ điều hành khi người dùng CHỌN "Theo hệ thống". Chọn cứng
   * Sáng hoặc Tối thì đổi chủ đề macOS không được phép động vào app.
   */
  useEffect(() => {
    if (display.theme !== 'system') return

    return watchSystemTheme(() => applyDisplay(display))
  }, [display])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
