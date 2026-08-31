import type { CSSProperties } from 'react'
import { NavLink, useLocation } from 'react-router'
import { BookmarkIcon, ChartIcon, ReviewIcon, SearchIcon, TopicIcon, UserIcon } from '@/components/icons'
import { cn } from '@/lib/cn'

/**
 * NĂM tab trên mobile, SÁU mục trên desktop.
 *
 * Bốn tab trong suốt vạch ship MVP; Thống kê thêm ở P17; Chủ đề thêm khi màn
 * học theo chủ đề lên — không ship tab dẫn tới màn trống.
 *
 * `desktopOnly` là điểm khác biệt duy nhất giữa hai bố cục về NỘI DUNG.
 * "Học theo chủ đề" là việc hàng ngày và cần chỗ trong thanh dưới; "Tài khoản"
 * là màn mở vài lần rồi thôi, nên trên mobile nó lùi lên icon ở header. Thanh
 * dưới 360px chia sáu là 60px mỗi tab, và ở cỡ chữ 130% nhãn dài bắt đầu chật —
 * đây là cách giữ năm tab mà vẫn có Chủ đề.
 *
 * Desktop là sidebar dọc, không có ràng buộc bề ngang đó, nên nó giữ đủ sáu.
 *
 * Mục `desktopOnly` phải nằm CUỐI mảng: chỉ số của năm mục còn lại nhờ vậy
 * giống nhau ở cả hai bố cục, và pill nền không cần biết mình đang ở đâu.
 */
const TABS = [
  { to: '/search', label: 'Tìm kiếm', Icon: SearchIcon, desktopOnly: false },
  { to: '/vocabulary', label: 'Kho từ', Icon: BookmarkIcon, desktopOnly: false },
  { to: '/review', label: 'Ôn tập', Icon: ReviewIcon, desktopOnly: false },
  { to: '/topics', label: 'Chủ đề', Icon: TopicIcon, desktopOnly: false },
  { to: '/stats', label: 'Thống kê', Icon: ChartIcon, desktopOnly: false },
  { to: '/account', label: 'Tài khoản', Icon: UserIcon, desktopOnly: true },
] as const

/** Số tab THẤY ĐƯỢC trên mobile — pill nền chia theo con số này. */
const MOBILE_TAB_COUNT = TABS.filter((tab) => !tab.desktopOnly).length

/**
 * MỘT `<nav>` duy nhất, đổi hình dạng bằng CSS.
 *
 * Không tách thành hai component "bottom" và "side" rồi ẩn/hiện bằng
 * `lg:hidden`: cả hai vẫn nằm trong DOM, nên screen reader thấy HAI landmark
 * điều hướng trùng tên và người dùng phải đoán cái nào đang thật. CSS đổi bố
 * cục thì chỉ có một cây DOM cho mọi kích thước màn.
 *
 * `<768px` thanh dưới · `>1024px` sidebar, nội dung vẫn tối đa 1200px —
 * desktop mở rộng chứ KHÔNG thành admin dashboard.
 */
export function BottomNavigation() {
  const { pathname } = useLocation()

  /*
   * Pill nền trượt được dựng bằng MỘT phần tử CSS, không phải shared-layout
   * animation của `motion`.
   *
   * Lý do là chi phí đo được: `motion` trước đây chỉ nằm trong chunk lười (chỉ
   * `BottomSheet` dùng, qua route `GalleryPage`). Import nó vào thanh điều hướng
   * — thứ luôn có mặt — kéo cả thư viện vào bundle chính: +40.9 kB gzip cho một
   * hiệu ứng trượt. CSS làm được gần như y hệt với chi phí bằng không.
   *
   * Trượt được vì cả hai bố cục đều là lưới ĐỀU: mobile 5 cột bằng nhau (mỗi
   * cột 100% chiều rộng pill), desktop xếp dọc bước 3rem (`min-h-11` 2.75rem +
   * `gap-1` 0.25rem).
   */
  const activeIndex = TABS.findIndex(
    (tab) => pathname === tab.to || pathname.startsWith(`${tab.to}/`),
  )

  return (
    <nav
      aria-label="Điều hướng chính"
      className={cn(
        'border-border bg-surface sticky bottom-0 z-10 border-t pb-[env(safe-area-inset-bottom)]',
        'lg:static lg:w-56 lg:shrink-0 lg:border-t-0 lg:border-r lg:p-4 lg:pb-4',
      )}
    >
      {/* `isolate`: `-z-10` của pill phải bị nhốt ở đây, nếu không nó tụt xuống
          dưới nền `<nav>` và biến mất. `relative` một mình không tạo stacking context. */}
      <ul className="relative isolate mx-auto flex max-w-3xl lg:mx-0 lg:flex-col lg:gap-1">
        {activeIndex >= 0 && (
          <span
            aria-hidden
            // `--tab-count` lấy từ TABS chứ không viết cứng `w-1/5`: thêm tab
            // thứ sáu mà quên sửa chiều rộng thì pill sẽ lệch mà không báo gì.
            style={{ '--tab-index': activeIndex, '--tab-count': MOBILE_TAB_COUNT } as CSSProperties}
            className={cn(
              'bg-primary-soft rounded-control-lg duration-ui ease-soft absolute -z-10 transition-transform',
              'inset-y-1 left-0 w-[calc(100%/var(--tab-count))] translate-x-[calc(var(--tab-index)*100%)]',
              'lg:inset-x-0 lg:top-0 lg:h-11 lg:w-full lg:translate-x-0 lg:translate-y-[calc(var(--tab-index)*3rem)]',
              // Đang ở một mục chỉ-có-trên-desktop (`/account`): trên mobile
              // mục đó không có ô nào để tô, và pill sẽ trượt ra ngoài màn hình.
              activeIndex >= MOBILE_TAB_COUNT && 'max-lg:hidden',
            )}
          />
        )}

        {TABS.map(({ to, label, Icon, desktopOnly }) => (
          <li
            key={to}
            className={cn(
              'flex-1 lg:flex-none',
              // Ẩn bằng CSS, KHÔNG bỏ khỏi DOM: cây DOM giữ nguyên ở mọi cỡ màn
              // nên vẫn chỉ có một landmark điều hướng, đúng lý do file này từ
              // chối tách thành hai component.
              desktopOnly && 'hidden lg:block',
            )}
          >
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'text-caption flex min-h-14 flex-col items-center justify-center gap-1',
                  'duration-ui ease-soft transition-colors',
                  'lg:text-body lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-control-lg lg:px-3',
                  // Active dùng primary; inactive giữ quiet — hồng là accent,
                  // không phủ nền lớn.
                  isActive ? 'text-primary lg:font-medium' : 'text-text-secondary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} />
                  <span>{label}</span>
                  {isActive && <span className="sr-only">(đang xem)</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
