import { Link } from 'react-router'
import { BrandMark } from '@/components/common/BrandMark'
import { ContrastIcon, MoonIcon, SettingsIcon, SunIcon, UserIcon } from '@/components/icons'
import { StreakChip } from '@/features/streak/components/StreakChip'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { THEMES, type Theme } from '@/lib/display-theme'
import { useDisplay } from '@/stores/display'
import { MainNavigation } from './MainNavigation'

/**
 * Nhãn nói HÀNH ĐỘNG sắp xảy ra, không phải trạng thái hiện tại.
 *
 * Cùng quy ước mà nút đánh dấu ở `VocabularyCard` dùng. Một nút tên "Chế độ
 * tối" thì người dùng screen reader không biết nó đang bật hay đang tắt — nhãn
 * phải nói bấm vào sẽ được gì.
 */
const NEXT_LABEL: Record<Theme, string> = {
  light: 'Chuyển sang chế độ tối',
  dark: 'Dùng chủ đề theo hệ thống',
  system: 'Chuyển sang chế độ sáng',
}

const ICONS: Record<Theme, typeof SunIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  system: ContrastIcon,
}

/**
 * Thanh trên cùng: wordmark · menu · nhóm hành động.
 *
 * ── Desktop KHÔNG còn sidebar ───────────────────────────────────────────────
 *
 * Trước đây điều hướng desktop là một cột 224px bên trái, và nó tính phí hai
 * lần: 224px bề ngang mất hẳn ở mọi màn, cộng một trục đối xứng thứ hai khiến
 * nội dung không bao giờ nằm giữa cửa sổ. Với một app chỉ có năm màn cấp một
 * thì cột đó chứa năm dòng chữ và một khoảng trắng dài — nó mang dáng admin
 * dashboard mà chính `AppShell` đã ghi là điều phải tránh.
 *
 * Menu ngang trả lại toàn bộ bề ngang cho nội dung và gom mọi lối đi vào MỘT
 * hàng. `MainNavigation` vẫn là đúng một `<nav>` cho mọi cỡ màn — xem docstring
 * của nó để biết vì sao ở mobile nó `fixed` chứ không `sticky`.
 *
 * ── Ràng buộc: không `backdrop-filter` trên chính `<header>` ────────────────
 *
 * Nền mờ vẽ bằng một lớp phủ `absolute` tách rời, KHÔNG bằng `backdrop-blur`
 * đặt thẳng lên `<header>`. `backdrop-filter` biến phần tử thành containing
 * block của mọi con `position: fixed`, và thanh điều hướng mobile là một con
 * như thế — đặt blur ở đây thì nó dính vào đáy header thay vì đáy màn hình.
 * Lớp phủ là anh em của `<nav>`, không phải tổ tiên, nên nó mờ được mà không
 * ảnh hưởng gì.
 *
 * ── Nhóm hành động ─────────────────────────────────────────────────────────
 *
 * Chuỗi ngày · đổi chủ đề · cài đặt · tài khoản. Không có nút chuông như bản
 * showcase, và luật đứng sau chỗ trống đó vẫn nguyên: `SearchBar` đã bỏ nút
 * camera vì cùng lý do — ship một nút không làm gì còn tệ hơn không có nút.
 *
 * `StreakChip` được thêm vì nó KHÔNG phải một nút chết: nó mang một con số thật
 * và dẫn tới một màn thật. Nó tự ẩn khi người dùng chưa có chuỗi nào.
 *
 * Lối tắt Cài đặt chỉ hiện từ `lg`. Trên mobile nó là mục thứ tư trong một hàng
 * đã chật, và màn Tài khoản ngay cạnh đã có lối vào đầy đủ; trên desktop thì
 * hàng còn rộng và việc đổi màu/cỡ chữ đáng một lần bấm thay vì hai.
 *
 * Nút đổi chủ đề KHÔNG thay màn Hiển thị & chữ. Nó là lối tắt cho trục được
 * dùng nhiều nhất; màu chủ đạo, font, cỡ chữ, tông chữ và độ mượt vẫn nằm ở
 * `/account/settings`. Cả hai đọc chung một store nên không bao giờ lệch nhau.
 */
export function AppHeader() {
  const theme = useDisplay((state) => state.theme)
  const setTheme = useDisplay((state) => state.setTheme)
  const Icon = ICONS[theme]

  function cycleTheme() {
    const index = THEMES.indexOf(theme)
    const next = THEMES[(index + 1) % THEMES.length]

    if (next) setTheme(next)
  }

  return (
    <header
      className={
        // `pt-[env(safe-area-inset-top)]` đối xứng với `pb-[env(safe-area-inset-bottom)]`
        // của thanh điều hướng — trên máy có notch, header không được chui xuống dưới nó.
        'border-border sticky top-0 z-20 border-b pt-[env(safe-area-inset-top)]'
      }
    >
      {/* Nền mờ tách rời — xem khối ràng buộc trong docstring. */}
      <span aria-hidden className="bg-surface/85 absolute inset-0 -z-10 backdrop-blur-sm" />

      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4 lg:h-16 lg:max-w-5xl">
        {/*
          Wordmark là `<span>` trong link, KHÔNG phải `<h1>`. Mỗi màn đã có đúng
          một `<h1>` của riêng nó; thêm một cái nữa ở đây là hai heading cấp một
          trên cùng một trang, và screen reader mất mốc điều hướng.
        */}
        {/*
          Mark + chữ, KHÔNG phải một file ảnh logo. Chữ `hanora` là text HTML
          thật nên nó theo font người dùng chọn ở màn Hiển thị & chữ; mark ăn
          `currentColor` nên nó theo `text-primary` ở mọi màu chủ đạo và cả hai
          chủ đề.
        */}
        <Link
          to="/search"
          className="text-primary text-title flex shrink-0 items-center gap-2 lowercase"
        >
          {/*
            Mark ngồi trên một đĩa tint thay vì nằm trần trên nền header.

            Đây là chỗ duy nhất trong app hiện màu chủ đạo ở MỌI màn, nên nó
            gánh phần lớn việc "app này màu gì". Một bông hoa 22px nét mảnh thì
            quá nhỏ để trả lời câu đó; đĩa `primary-soft` phía sau nâng diện
            tích màu lên đủ để nhận ra từ xa mà không phải phóng to logo.
          */}
          <span className="bg-primary-soft flex size-9 items-center justify-center rounded-full">
            <BrandMark size={22} />
          </span>
          hanora
        </Link>

        {/*
          ĐÚNG MỘT lần render, không phải một bản cho mobile và một bản cho
          desktop. Hai `<nav>` cùng tên trong DOM là hai landmark điều hướng
          trùng nhau, và người dùng screen reader phải đoán cái nào đang thật —
          chính là lý do `MainNavigation` từ chối tách làm hai component.

          Ở mobile nó là `fixed` nên nó rơi khỏi luồng của hàng này và đi xuống
          đáy màn; ở desktop nó trở lại là ô giữa của hàng.
        */}
        <MainNavigation />

        {/*
          `ml-auto` chỉ cần ở mobile: lúc đó `<nav>` nằm ngoài luồng nên hàng
          chỉ có wordmark và nhóm này, không có gì đẩy nhóm sang phải. Từ `lg`
          thì `<nav>` chiếm phần giữa và tự làm việc đó.
        */}
        <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
          <StreakChip />

          <IconButton label={NEXT_LABEL[theme]} icon={<Icon size={20} />} onClick={cycleTheme} />

          {/*
            `<Link>` chứ không phải `IconButton` + `navigate()`: đây là ĐIỀU
            HƯỚNG, nên nó phải mở được ở tab mới, copy được địa chỉ, và hiện ra
            trong danh sách link của screen reader. Một `<button>` không làm
            được gì trong ba thứ đó.
          */}
          <HeaderLink to="/account/settings" label="Hiển thị & chữ" className="hidden lg:flex">
            <SettingsIcon size={20} />
          </HeaderLink>

          <HeaderLink to="/account" label="Tài khoản">
            <UserIcon size={20} />
          </HeaderLink>
        </div>
      </div>
    </header>
  )
}

/**
 * Link dạng icon trong nhóm hành động.
 *
 * Tách ra khi có cái thứ hai, không phải từ đầu: hai link lặp lại cùng một
 * chuỗi class dài thì lần thêm cái thứ ba chỉ phải sửa một chỗ, và không có
 * nguy cơ hai icon lệch nhau vài pixel. Cùng lập luận mà `SettingsLink` ở màn
 * Tài khoản đã ghi.
 */
function HeaderLink({
  to,
  label,
  className,
  children,
}: {
  to: string
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        'text-text-secondary hover:bg-primary-pale hover:text-primary active:bg-primary-soft',
        'rounded-control-lg flex size-11 items-center justify-center',
        'duration-ui ease-soft transition-colors',
        className,
      )}
    >
      {children}
    </Link>
  )
}
