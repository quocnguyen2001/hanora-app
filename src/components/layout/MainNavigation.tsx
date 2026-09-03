import type { CSSProperties } from 'react'
import { NavLink, useLocation } from 'react-router'
import { BookmarkIcon, ChartIcon, ReviewIcon, SearchIcon, TopicIcon } from '@/components/icons'
import { cn } from '@/lib/cn'

/**
 * NĂM mục, giống hệt nhau ở cả hai bố cục.
 *
 * Trước đây mảng này có mục thứ sáu — "Tài khoản" — chỉ hiện trên desktop, vì
 * sidebar dọc có chỗ còn thanh dưới 360px chia sáu thì mỗi tab còn 60px. Bỏ
 * sidebar là bỏ luôn lý do đó: menu ngang trên desktop cũng chịu ràng buộc bề
 * ngang như thanh dưới, nên hai bố cục giờ mang ĐÚNG một danh sách.
 *
 * "Tài khoản" chuyển hẳn sang icon ở nhóm hành động bên phải header, ở MỌI cỡ
 * màn. Nó là màn mở vài lần rồi thôi — đứng cạnh Cài đặt và Chủ đề thì đúng
 * nhóm hơn là đứng cạnh bốn việc hàng ngày.
 */
const TABS = [
  { to: '/search', label: 'Tìm kiếm', Icon: SearchIcon },
  { to: '/vocabulary', label: 'Kho từ', Icon: BookmarkIcon },
  { to: '/review', label: 'Ôn tập', Icon: ReviewIcon },
  { to: '/topics', label: 'Chủ đề', Icon: TopicIcon },
  { to: '/stats', label: 'Thống kê', Icon: ChartIcon },
] as const

/**
 * MỘT `<nav>` duy nhất, đổi hình dạng bằng CSS.
 *
 * Không tách thành hai component "mobile" và "desktop" rồi ẩn/hiện bằng
 * `lg:hidden`: cả hai vẫn nằm trong DOM, nên screen reader thấy HAI landmark
 * điều hướng trùng tên và người dùng phải đoán cái nào đang thật.
 *
 * ── Vì sao `fixed` ở mobile chứ không `sticky` ──────────────────────────────
 *
 * Component này render BÊN TRONG `<header>` (xem `AppHeader`), vì trên desktop
 * menu phải nằm trong cùng hàng với wordmark. Ở mobile thì nó phải rơi xuống
 * đáy màn — mà đáy màn không phải chỗ nào trong luồng của header, nên chỉ
 * `fixed` mới tới được.
 *
 * Điều đó đặt một ràng buộc lên `AppHeader`: KHÔNG được có `backdrop-filter`,
 * `filter` hay `transform` trên bất kỳ tổ tiên nào của `<nav>`. Bốn thuộc tính
 * đó biến phần tử thành containing block của mọi con `fixed`, và thanh điều
 * hướng sẽ dính vào đáy HEADER thay vì đáy màn hình. `AppHeader` vẽ nền mờ
 * bằng một lớp phủ tách rời chính vì lý do này.
 *
 * Hệ quả thứ hai: `fixed` nằm ngoài luồng bố cục nên nó KHÔNG tự chừa chỗ.
 * `AppShell` phải tự đệm đáy cho `<main>`; thiếu đệm là dòng cuối mọi trang
 * nằm dưới thanh điều hướng.
 */
export function MainNavigation() {
  const { pathname } = useLocation()

  /*
   * Pill nền trượt được dựng bằng MỘT phần tử CSS, không phải shared-layout
   * animation của `motion`.
   *
   * Lý do là chi phí đo được: `motion` chỉ nằm trong chunk lười (chỉ
   * `BottomSheet` dùng, qua route `GalleryPage`). Import nó vào thanh điều hướng
   * — thứ luôn có mặt — kéo cả thư viện vào bundle chính: +40.9 kB gzip cho một
   * hiệu ứng trượt. CSS làm được gần như y hệt với chi phí bằng không.
   *
   * Pill CHỈ tồn tại ở bố cục mobile. Nó trượt được vì thanh dưới là lưới ĐỀU:
   * năm cột bằng nhau, mỗi cột đúng 100% chiều rộng pill. Menu ngang trên
   * desktop thì không đều — "Kho từ" và "Thống kê" dài ngắn khác nhau — nên ở
   * đó mỗi mục tự tô nền của mình. Ép sáu nhãn về cùng bề rộng chỉ để giữ được
   * hiệu ứng trượt là đánh đổi ngược chiều: hiệu ứng phục vụ bố cục, không phải
   * ngược lại.
   */
  const activeIndex = TABS.findIndex(
    (tab) => pathname === tab.to || pathname.startsWith(`${tab.to}/`),
  )

  return (
    <nav
      aria-label="Điều hướng chính"
      className={cn(
        'border-border bg-surface fixed inset-x-0 bottom-0 z-30 border-t',
        'pb-[env(safe-area-inset-bottom)]',
        // Trên desktop nó trở lại là một phần tử bình thường trong hàng header,
        // chiếm phần giữa và tự căn giữa trong đó.
        'lg:static lg:z-auto lg:flex lg:flex-1 lg:justify-center',
        'lg:border-t-0 lg:bg-transparent lg:pb-0',
      )}
    >
      {/* `isolate`: `-z-10` của pill phải bị nhốt ở đây, nếu không nó tụt xuống
          dưới nền `<nav>` và biến mất. `relative` một mình không tạo stacking context. */}
      <ul className="relative isolate mx-auto flex max-w-3xl lg:mx-0 lg:max-w-none lg:gap-1">
        {activeIndex >= 0 && (
          <span
            aria-hidden
            // `--tab-count` lấy từ TABS chứ không viết cứng `w-1/5`: thêm tab
            // thứ sáu mà quên sửa chiều rộng thì pill sẽ lệch mà không báo gì.
            style={{ '--tab-index': activeIndex, '--tab-count': TABS.length } as CSSProperties}
            className={cn(
              'bg-primary-soft border-primary/25 rounded-control-lg border',
              'duration-ui ease-soft absolute -z-10 transition-transform',
              'inset-y-1 left-0 w-[calc(100%/var(--tab-count))] translate-x-[calc(var(--tab-index)*100%)]',
              'lg:hidden',
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
                  'lg:text-body lg:rounded-control-lg lg:min-h-11 lg:flex-row lg:gap-2 lg:px-3',
                  // Active dùng primary; inactive giữ quiet — màu chủ đạo là
                  // accent, không phủ nền lớn.
                  // `font-bold` ở CẢ hai bố cục, không chỉ desktop. Trên thanh
                  // dưới, nhãn 12px tô màu nhạt là khác biệt duy nhất giữa tab
                  // đang xem và bốn tab kia — quá mảnh để đọc được liếc qua, và
                  // vô nghĩa với người không phân biệt được sắc màu đó.
                  isActive ? 'text-primary font-bold' : 'text-text-secondary',
                  // Nền của mục đang xem trên desktop. Ở mobile việc này do pill
                  // trượt lo, nên chỉ mở từ `lg` — hai lớp nền chồng nhau sẽ đậm
                  // gấp đôi và pill mất luôn tác dụng.
                  isActive
                    ? 'lg:bg-primary-soft lg:ring-primary/25 lg:ring-1'
                    : 'lg:hover:bg-primary-pale lg:hover:text-primary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Icon nhích to ở tab đang xem — lớp thứ ba sau màu và độ
                      đậm, cùng cách mà nút đánh dấu ở `VocabularyCard` làm. */}
                  <Icon size={isActive ? 24 : 22} />
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
