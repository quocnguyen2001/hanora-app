import type { CSSProperties } from 'react'
import { NavLink, useLocation } from 'react-router'
import { BookmarkIcon, ChartIcon, ReviewIcon, SearchIcon, UserIcon } from '@/components/icons'
import { cn } from '@/lib/cn'

/**
 * NĂM tab kể từ P17.
 *
 * Bốn tab trong suốt vạch ship MVP; tab Thống kê chỉ được thêm khi P16/P17 đã
 * xong và màn đó có nội dung thật — không ship tab dẫn tới màn trống.
 */
const TABS = [
  { to: '/search', label: 'Tìm kiếm', Icon: SearchIcon },
  { to: '/vocabulary', label: 'Kho từ', Icon: BookmarkIcon },
  { to: '/review', label: 'Ôn tập', Icon: ReviewIcon },
  { to: '/stats', label: 'Thống kê', Icon: ChartIcon },
  { to: '/account', label: 'Tài khoản', Icon: UserIcon },
] as const

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
            style={{ '--tab-index': activeIndex, '--tab-count': TABS.length } as CSSProperties}
            className={cn(
              'bg-primary-soft rounded-control-lg duration-ui ease-soft absolute -z-10 transition-transform',
              'inset-y-1 left-0 w-[calc(100%/var(--tab-count))] translate-x-[calc(var(--tab-index)*100%)]',
              'lg:inset-x-0 lg:top-0 lg:h-11 lg:w-full lg:translate-x-0 lg:translate-y-[calc(var(--tab-index)*3rem)]',
            )}
          />
        )}

        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1 lg:flex-none">
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
