import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'
import { OfflineBanner } from '@/components/common/OfflineBanner'
import { UpdatePrompt } from '@/components/common/UpdatePrompt'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { AppHeader } from './AppHeader'
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
  const location = useLocation()

  return (
    // Nền chuyển sắc rất nhạt: ấm ở trên rồi tan về nền nền, để thẻ trắng nổi
    // lên thay vì chìm vào một mặt phẳng trắng. `via-background` đặt điểm tan
    // sớm — hồng là accent, không được phủ nền lớn (`ux-rules.md`).
    <div className="from-primary-pale via-background to-background text-text-primary flex min-h-dvh flex-col-reverse bg-linear-to-b lg:flex-row">
      <BottomNavigation />

      <div className="flex flex-1 flex-col">
        <AppHeader />
        <UpdatePrompt />
        <OfflineBanner />

        {/* Bỏ qua điều hướng — người dùng bàn phím không phải Tab qua 4 tab mỗi lần đổi trang. */}
        <a
          href="#main"
          className="focus:bg-primary focus:rounded-control focus:text-on-primary sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2"
        >
          Tới nội dung chính
        </a>

        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:max-w-[1200px]">
          {/*
            Chuyển trang mờ dần bằng CSS, KHÔNG dùng `AnimatePresence`.
            Đổi `key` khiến React mount lại nhánh này, nên animation `rise` chạy
            lại từ đầu mỗi lần đổi route.

            Đánh đổi có chủ đích: cách này không có exit animation. Đổi lại, nó
            không kéo `motion` vào bundle chính (+40.9 kB gzip) — và exit vốn là
            phần rủi ro nhất: `mode="wait"` hoãn mount route mới cho tới khi
            route cũ thoát xong, cộng thẳng vào độ trễ điều hướng cảm nhận được.

            `key` bọc cả `Suspense` nên skeleton fallback là một phần của cùng
            lượt animate, không tự nháy riêng khi tải chunk.

            Reduced-motion: block trong `app.css` đã ép mọi animation CSS về
            0.01ms, không cần xử lý thêm ở đây.
          */}
          <div key={location.pathname} className="animate-rise">
            {/*
              Route tải lười: khung xương ĐÚNG HÌNH DẠNG trang sắp hiện, không
              phải một khối chung.

              Trước đây chỗ này là đúng một `h-64` cho MỌI route, và nó tạo ra
              một bậc thừa trong chuỗi chờ: người dùng thấy khối xám lạ → chunk
              về, trang thay bằng khung xương của chính nó (hình khác hẳn) → dữ
              liệu về, nội dung thay vào. Ba bố cục khác nhau trước khi thấy chữ.

              Dùng chung định nghĩa với nhánh `isPending` trong từng trang, nên
              bước giữa biến mất: khung xương đứng NGUYÊN tại chỗ từ lúc chunk
              chưa về cho tới lúc dữ liệu thật thay vào.
            */}
            <Suspense fallback={<PageSkeleton pathname={location.pathname} />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
