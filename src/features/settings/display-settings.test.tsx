import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyDisplay,
  DEFAULT_DISPLAY,
  resolveTheme,
  STORAGE_KEY,
  THEME_COLOR,
} from '@/lib/display-theme'
import { useDisplay } from '@/stores/display'
import { DisplaySettingsPage } from './pages/DisplaySettingsPage'

/**
 * jsdom không có `matchMedia`. Mock nó chứ không né bằng cách chỉ test hai chủ
 * đề cứng: `system` là giá trị MẶC ĐỊNH, nên đường đi qua `matchMedia` là đường
 * mà hầu hết người dùng thực sự chạy.
 */
function mockPrefersDark(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  )
}

beforeEach(() => {
  mockPrefersDark(false)
  useDisplay.setState({ ...DEFAULT_DISPLAY })
  window.localStorage.removeItem(STORAGE_KEY)

  for (const key of ['theme', 'font', 'textTone', 'motion']) {
    delete document.documentElement.dataset[key]
  }

  document.documentElement.style.removeProperty('--font-scale')
  document.head.innerHTML = '<meta name="theme-color" content="#FF6F91" />'
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveTheme', () => {
  it('trả đúng giá trị cứng mà không hỏi hệ điều hành', () => {
    mockPrefersDark(true)

    // Chọn Sáng thì phải là sáng, kể cả khi hệ điều hành đang tối. Đây là lý do
    // toàn bộ tính năng tồn tại — người dùng ĐÈ LÊN mặc định của hệ thống.
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('quy đổi `system` theo prefers-color-scheme', () => {
    mockPrefersDark(true)
    expect(resolveTheme('system')).toBe('dark')

    mockPrefersDark(false)
    expect(resolveTheme('system')).toBe('light')
  })
})

describe('applyDisplay', () => {
  it('đặt đủ bốn thuộc tính data và biến cỡ chữ lên <html>', () => {
    applyDisplay({
      theme: 'dark',
      font: 'lora',
      fontScale: 1.2,
      textTone: 'warm',
      motion: 'reduced',
    })

    const root = document.documentElement

    expect(root.dataset.theme).toBe('dark')
    expect(root.dataset.font).toBe('lora')
    expect(root.dataset.textTone).toBe('warm')
    expect(root.dataset.motion).toBe('reduced')
    expect(root.style.getPropertyValue('--font-scale')).toBe('1.2')
  })

  it('không bao giờ ghi `system` vào DOM — CSS chỉ được thấy light hoặc dark', () => {
    mockPrefersDark(true)
    applyDisplay({ ...DEFAULT_DISPLAY, theme: 'system' })

    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('đổi cả màu thanh trạng thái theo chủ đề', () => {
    applyDisplay({ ...DEFAULT_DISPLAY, theme: 'dark' })
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      THEME_COLOR.dark,
    )

    applyDisplay({ ...DEFAULT_DISPLAY, theme: 'light' })
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      THEME_COLOR.light,
    )
  })
})

describe('store hiển thị', () => {
  it('ghi xuống localStorage đúng khóa và đúng shape mà script chống nháy đọc', () => {
    useDisplay.getState().setTheme('dark')
    useDisplay.getState().setFontScale(1.3)

    const raw = window.localStorage.getItem(STORAGE_KEY)

    expect(raw).not.toBeNull()

    /*
     * Script inline trong `index.html` đọc `JSON.parse(raw).state`. Nếu zustand
     * đổi cách bọc, hoặc ai đó đổi tên khóa, thì script đó im lặng rơi về mặc
     * định và người dùng thấy nháy chủ đề mỗi lần mở app — không có lỗi nào
     * được ném ra. Test này là thứ duy nhất bắt được điều đó.
     */
    const parsed = JSON.parse(raw as string) as { state: { theme: string; fontScale: number } }

    expect(parsed.state.theme).toBe('dark')
    expect(parsed.state.fontScale).toBe(1.3)
  })

  it('reset đưa mọi trục về mặc định', () => {
    const store = useDisplay.getState()

    store.setTheme('dark')
    store.setFont('lora')
    store.setTextTone('high')
    store.setMotion('reduced')
    store.reset()

    expect(useDisplay.getState().theme).toBe(DEFAULT_DISPLAY.theme)
    expect(useDisplay.getState().font).toBe(DEFAULT_DISPLAY.font)
    expect(useDisplay.getState().textTone).toBe(DEFAULT_DISPLAY.textTone)
    expect(useDisplay.getState().motion).toBe(DEFAULT_DISPLAY.motion)
  })
})

describe('màn Hiển thị & chữ', () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <DisplaySettingsPage />
      </MemoryRouter>,
    )
  }

  it('dùng radiogroup chứ không phải tablist', () => {
    renderPage()

    /*
     * Ràng buộc ngữ nghĩa, không phải thẩm mỹ. `Tabs` sẵn có trông gần giống
     * nhưng là `role="tablist"` — vai trò đó nói với screen reader rằng có các
     * panel nội dung để chuyển qua lại, và một nhóm cài đặt thì không.
     */
    expect(screen.getByRole('radiogroup', { name: 'Chủ đề' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Font chữ' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Tông chữ' })).toBeInTheDocument()
    expect(screen.queryAllByRole('tablist')).toHaveLength(0)
  })

  it('bấm một lựa chọn ghi thẳng vào store', async () => {
    const user = userEvent.setup()

    renderPage()
    const themeGroup = screen.getByRole('radiogroup', { name: 'Chủ đề' })

    await user.click(within(themeGroup).getByRole('radio', { name: /Tối/ }))

    expect(useDisplay.getState().theme).toBe('dark')
  })

  it('phím mũi tên di chuyển trong nhóm và vòng lại đầu cuối', async () => {
    const user = userEvent.setup()

    renderPage()

    const themeGroup = screen.getByRole('radiogroup', { name: 'Chủ đề' })

    /*
     * Truy vấn PHẢI giới hạn trong nhóm: nhãn "Hệ thống" xuất hiện ở cả Chủ đề
     * lẫn Font chữ. Với người dùng thật thì nhãn của radiogroup đã tách bạch hai
     * cái, nhưng `getByRole` toàn cục thì không.
     */
    // Không destructure `getByRole` ra khỏi `within(...)`: tách một method khỏi
    // object của nó là đúng thứ `@typescript-eslint/unbound-method` chặn.
    // Mặc định là `system` — mục cuối. Mũi tên phải phải vòng về mục đầu.
    // `keyboard` chứ không phải `type(themeGroup, …)`: một `<div>` không nhận
    // được focus, nên gõ thẳng vào nó không sinh ra keydown nào. Cú click ở trên
    // đã đặt focus lên nút, và sự kiện nổi bọt lên `onKeyDown` của nhóm.
    await user.click(within(themeGroup).getByRole('radio', { name: /Hệ thống/ }))
    await user.keyboard('{ArrowRight}')

    expect(useDisplay.getState().theme).toBe('light')
  })

  it('thanh cỡ chữ nói ra chữ chứ không đọc số thứ tự', () => {
    renderPage()

    const slider = screen.getByRole('slider', { name: 'Cỡ chữ' })

    // `aria-valuetext` là thứ screen reader đọc. Không có nó, người dùng nghe
    // "2" và không biết đó là cỡ gì.
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('Vừa'))
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('100%'))
  })
})
