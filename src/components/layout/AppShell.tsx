import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'
import { OfflineBanner } from '@/components/common/OfflineBanner'
import { UpdatePrompt } from '@/components/common/UpdatePrompt'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { cn } from '@/lib/cn'
import { AppHeader } from './AppHeader'

/**
 * Khung chung của mọi màn.
 *
 * Responsive:
 *   <768px   một cột + thanh điều hướng cố định dưới đáy màn
 *   768–1024 nội dung căn giữa
 *   >1024px  điều hướng vào thẳng header, nội dung tối đa 1024px
 *
 * ── Vì sao trần là 1024px chứ không phải 1200px ─────────────────────────────
 *
 * 1200 là con số ghi trong `responsive.md`, và nó được đặt khi desktop còn có
 * sidebar 224px: `main` chỉ chạm được 1200 trên màn rộng từ ~1424px, còn ở
 * 1280px thực tế nó rộng 1024. Bỏ sidebar mà giữ nguyên con số cũ là âm thầm
 * NỚI cột nội dung ra 1168px trên mọi màn.
 *
 * Và nới ra là sai hướng cho app này: bốn trong sáu màn (Tìm kiếm, Kho từ, Ôn
 * tập, Tài khoản) là danh sách MỘT cột. Một ô tìm kiếm rộng 1168px hay một thẻ
 * từ trải hết bề ngang không đọc ra là rộng rãi — nó đọc ra là trang chưa dựng
 * xong. Hai màn còn lại là lưới (Chủ đề, Thống kê) và chúng vẫn đủ chỗ cho 4
 * cột ở 1024.
 *
 * 1024 vì thế GIỮ NGUYÊN bề ngang nội dung mà người dùng desktop đang có, và
 * phần sidebar trả lại được tiêu vào việc căn giữa thật sự thay vì vào việc kéo
 * dài từng dòng. Header dùng chung đúng con số này nên hai khối thẳng hàng.
 *
 * ── Sidebar đã bỏ ───────────────────────────────────────────────────────────
 *
 * Bố cục desktop từng là `flex-row` với một cột điều hướng 224px bên trái. Nó
 * đi cùng `flex-col-reverse` ở mobile, và cặp đó giải quyết một bài toán a11y
 * thật: `<nav>` nằm SAU `<main>` trong DOM nhưng hiện ở đáy màn, nên người dùng
 * screen reader gặp nội dung trước.
 *
 * Menu ngang không giữ được cách đó — điều hướng giờ nằm trong `<header>`, tức
 * là trước `<main>` trong DOM ở mọi cỡ màn. Đổi lại bằng link bỏ qua điều
 * hướng, và link đó chuyển lên làm phần tử focus ĐẦU TIÊN của trang: trước đây
 * nó nằm sau header nên ở mobile nó gần như thừa; giờ nó là thứ thật sự gánh
 * việc, nên nó phải đứng đầu.
 */
export function AppShell() {
  const location = useLocation()

  return (
    // Quầng sáng màu chủ đạo ở đỉnh trang, để thẻ nổi lên thay vì chìm vào một
    // mặt phẳng trắng. Vệt màu khoá ở 512px đầu và KHÔNG kéo dài theo chiều cao
    // trang — xem `app-canvas` trong `app.css` để biết vì sao đó là ràng buộc
    // chứ không phải con số tuỳ ý.
    <div className="app-canvas text-text-primary flex min-h-dvh flex-col">
      {/* Bỏ qua điều hướng — người dùng bàn phím không phải Tab qua 5 tab mỗi lần đổi trang. */}
      <a
        href="#main"
        className="focus:bg-primary focus:rounded-control focus:text-on-primary sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2"
      >
        Tới nội dung chính
      </a>

      <AppHeader />
      <UpdatePrompt />
      <OfflineBanner />

      <main
        id="main"
        className={cn(
          'mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:max-w-5xl',
          /*
            Đệm đáy cho thanh điều hướng cố định ở mobile.

            `fixed` nằm ngoài luồng bố cục nên nó không tự chừa chỗ — thiếu dòng
            này thì dòng cuối của MỌI trang nằm khuất dưới thanh. 5rem = chiều
            cao thanh (`min-h-14`, 3.5rem) cộng một nhịp thở, và `env()` cộng
            thêm vùng an toàn của máy có thanh cử chỉ.

            Từ `lg` thanh trở về trong header nên đệm này biến mất.
          */
          'pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6',
        )}
      >
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
  )
}
