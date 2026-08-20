import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { OfflineBanner } from '@/components/common/OfflineBanner'
import { UpdatePrompt } from '@/components/common/UpdatePrompt'
import { Skeleton } from '@/components/ui/Skeleton'
import { BottomNavigation } from './BottomNavigation'

/**
 * Khung chung của mọi màn.
 *
 * Responsive theo `responsive.md`:
 *   <768px   một cột + thanh điều hướng dưới
 *   768–1024 nội dung căn giữa
 *   >1024px  điều hướng chuyển thành sidebar, nội dung tối đa 1200px
 *
 * Trần 1200px là có chủ đích: desktop chỉ mở rộng chứ KHÔNG được biến thành
 * admin dashboard.
 *
 * `flex-col-reverse` ở mobile để `<nav>` nằm SAU `<main>` trong DOM nhưng hiện
 * ở dưới màn hình: người dùng screen reader gặp nội dung trước, người dùng nhìn
 * thấy thanh nav ở đúng chỗ tay với tới.
 */
export function AppShell() {
  return (
    <div className="bg-background text-text-primary flex min-h-dvh flex-col-reverse lg:flex-row">
      <BottomNavigation />

      <div className="flex flex-1 flex-col">
        <UpdatePrompt />
        <OfflineBanner />

        {/* Bỏ qua điều hướng — người dùng bàn phím không phải Tab qua 4 tab mỗi lần đổi trang. */}
        <a
          href="#main"
          className="focus:bg-primary sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-[--radius-control] focus:px-4 focus:py-2 focus:text-white"
        >
          Tới nội dung chính
        </a>

        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:max-w-[1200px]">
          {/* Route tải lười: skeleton thay vì màn trắng trong lúc tải chunk. */}
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-[--radius-card]" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
