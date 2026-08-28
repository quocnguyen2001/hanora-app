import { Link } from 'react-router'
import { BrandMark } from '@/components/common/BrandMark'
import { ContrastIcon, MoonIcon, SunIcon } from '@/components/icons'
import { IconButton } from '@/components/ui/IconButton'
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
 * Thanh trên cùng: wordmark + lối tắt đổi chủ đề.
 *
 * KHÔNG có nút chuông như bản showcase. App chưa có tính năng thông báo, và
 * `SearchBar` đã bỏ nút camera vì đúng lý do đó — ship một nút không làm gì còn
 * tệ hơn không có nút, vì người dùng bấm rồi tự hỏi mình làm sai chỗ nào.
 *
 * Nút đổi chủ đề ở đây KHÔNG thay màn Hiển thị & chữ. Nó là lối tắt cho trục
 * được dùng nhiều nhất; font, cỡ chữ, tông chữ và độ mượt vẫn nằm ở
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

        <IconButton label={NEXT_LABEL[theme]} icon={<Icon size={20} />} onClick={cycleTheme} />
      </div>
    </header>
  )
}
