import { NavLink } from 'react-router'
import { ChartIcon, LibraryIcon, ReviewIcon, SearchIcon, UserIcon } from '@/components/icons'
import { cn } from '@/lib/cn'

/**
 * NĂM tab kể từ P17.
 *
 * Bốn tab trong suốt vạch ship MVP; tab Thống kê chỉ được thêm khi P16/P17 đã
 * xong và màn đó có nội dung thật — không ship tab dẫn tới màn trống.
 */
const TABS = [
  { to: '/search', label: 'Tìm kiếm', Icon: SearchIcon },
  { to: '/vocabulary', label: 'Kho từ', Icon: LibraryIcon },
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
  return (
    <nav
      aria-label="Điều hướng chính"
      className={cn(
        'border-border bg-surface sticky bottom-0 z-10 border-t pb-[env(safe-area-inset-bottom)]',
        'lg:static lg:w-56 lg:shrink-0 lg:border-t-0 lg:border-r lg:p-4 lg:pb-4',
      )}
    >
      <ul className="mx-auto flex max-w-3xl lg:mx-0 lg:flex-col lg:gap-1">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1 lg:flex-none">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'text-caption flex min-h-14 flex-col items-center justify-center gap-1 transition-colors',
                  'lg:text-body lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-control-lg lg:px-3',
                  // Active dùng primary; inactive giữ quiet — hồng là accent,
                  // không phủ nền lớn.
                  isActive
                    ? 'text-primary lg:bg-primary-soft lg:font-medium'
                    : 'text-text-secondary lg:hover:bg-primary-pale',
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
