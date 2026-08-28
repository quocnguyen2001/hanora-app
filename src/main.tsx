import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Providers } from '@/app/providers'
import { router } from '@/app/router'
import { SplashScreen } from '@/components/common/SplashScreen'
import '@/styles/app.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Không tìm thấy #root trong index.html')
}

createRoot(container).render(
  <StrictMode>
    <Providers>
      {/*
        Màn khởi động là ANH EM của router, không phải cổng chặn trước nó.
        Nó là lớp phủ `fixed`, nên app mount và chạy ngay phía sau: request đầu
        tiên bay đi trong lúc lớp phủ còn hiện, chứ không đợi nó tan.

        Đặt cạnh router thay vì trong `Providers` để `Providers` giữ đúng một
        việc — nối tầng HTTP và tùy chỉnh hiển thị — và để cây test dựng router
        mà không kéo theo một lớp phủ che mất mọi truy vấn.
      */}
      <SplashScreen />
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
