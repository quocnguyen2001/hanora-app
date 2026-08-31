import { Link } from 'react-router'
import { BrandMark } from '@/components/common/BrandMark'
import { ContrastIcon, MoonIcon, SunIcon, UserIcon } from '@/components/icons'
import { StreakChip } from '@/features/streak/components/StreakChip'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { THEMES, type Theme } from '@/lib/display-theme'
import { useDisplay } from '@/stores/display'

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
 * Thanh trên cùng: wordmark + chuỗi ngày + lối tắt đổi chủ đề.
 *
 * KHÔNG có nút chuông như bản showcase, và luật đứng sau chỗ trống đó vẫn
 * nguyên: `SearchBar` đã bỏ nút camera vì cùng lý do — ship một nút không làm gì
 * còn tệ hơn không có nút, vì người dùng bấm rồi tự hỏi mình làm sai chỗ nào.
 *
 * `StreakChip` được thêm vì nó KHÔNG phải một nút chết: nó mang một con số thật
 * và dẫn tới một màn thật. Nó tự ẩn khi người dùng chưa có chuỗi nào — đúng
 * cùng luật đó, áp cho một thứ chỉ có nghĩa khi đã có dữ liệu.
 *
 * Nút đổi chủ đề ở đây KHÔNG thay màn Hiển thị & chữ. Nó là lối tắt cho trục
 * được dùng nhiều nhất; font, cỡ chữ, tông chữ và độ mượt vẫn nằm ở
 * `/account/settings`. Cả hai đọc chung một store nên không bao giờ lệch nhau.
 *
 * Icon Tài khoản CHỈ hiện trên mobile (`lg:hidden`). Thanh dưới nhường chỗ cho
 * tab Chủ đề — việc hàng ngày — còn Tài khoản là màn mở vài lần rồi thôi, nên
 * nó lùi lên đây. Sidebar desktop vẫn có mục Tài khoản đầy đủ, nên trên desktop
 * icon này là thừa và bị ẩn.
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
        'border-border bg-surface/85 sticky top-0 z-20 border-b pt-[env(safe-area-inset-top)] backdrop-blur-sm'
      }
    >
      <div className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between px-4 lg:max-w-[1200px]">
        {/*
          Wordmark là `<span>` trong link, KHÔNG phải `<h1>`. Mỗi màn đã có đúng
          một `<h1>` của riêng nó; thêm một cái nữa ở đây là hai heading cấp một
          trên cùng một trang, và screen reader mất mốc điều hướng.
        */}
        {/*
          Mark + chữ, KHÔNG phải một file ảnh logo. Chữ `hanora` là text HTML
          thật nên nó theo font người dùng chọn ở màn Hiển thị & chữ; mark ăn
          `currentColor` nên nó theo `text-primary` ở cả hai chủ đề.
        */}
        <Link to="/search" className="text-primary text-title flex items-center gap-2 lowercase">
          <BrandMark size={22} />
          hanora
        </Link>

        <div className="flex items-center gap-1">
          <StreakChip />

          <IconButton label={NEXT_LABEL[theme]} icon={<Icon size={20} />} onClick={cycleTheme} />

          {/*
            `<Link>` chứ không phải `IconButton` + `navigate()`: đây là ĐIỀU
            HƯỚNG, nên nó phải mở được ở tab mới, copy được địa chỉ, và hiện ra
            trong danh sách link của screen reader. Một `<button>` không làm
            được gì trong ba thứ đó.
          */}
          <Link
            to="/account"
            aria-label="Tài khoản"
            className={cn(
              'text-text-secondary hover:bg-primary-pale active:bg-primary-soft',
              'rounded-control-lg flex size-11 items-center justify-center',
              'duration-ui ease-soft transition-colors',
              // Sidebar desktop đã có mục Tài khoản — ở đó icon này là thừa.
              'lg:hidden',
            )}
          >
            <UserIcon size={20} />
          </Link>
        </div>
      </div>
    </header>
  )
}
