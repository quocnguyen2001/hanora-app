import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import appConfig from '@/config/app.json'
import { FADE_TIMEOUT_MS, MIN_VISIBLE_MS, SplashScreen } from './SplashScreen'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/** Lớp phủ là `aria-hidden` nên `getByRole`/`getByText` không thấy nó. */
function splash(): HTMLElement | null {
  return document.querySelector('[aria-hidden]')
}

describe('SplashScreen', () => {
  it('hiện phiên bản lấy từ file cấu hình', () => {
    render(<SplashScreen />)

    expect(splash()?.textContent).toContain(`v${appConfig.version}`)
  })

  it('giữ nguyên trước khi hết thời gian tối thiểu', () => {
    render(<SplashScreen />)

    act(() => {
      vi.advanceTimersByTime(MIN_VISIBLE_MS - 1)
    })

    // Chưa vào giai đoạn tan: không có animation nào để `animationend` bắn.
    expect(splash()?.className).not.toContain('animate-splash-out')
  })

  it('bắt đầu tan sau khi hết thời gian tối thiểu', () => {
    render(<SplashScreen />)

    act(() => {
      vi.advanceTimersByTime(MIN_VISIBLE_MS)
    })

    expect(splash()?.className).toContain('animate-splash-out')
  })

  it('tự tháo khỏi cây kể cả khi animation không bao giờ chạy', () => {
    /*
     * Đây là chốt chặn, và nó là test QUAN TRỌNG NHẤT ở file này: hỏng ở đây
     * nghĩa là một lớp phủ toàn màn hình nằm chết đè lên app.
     *
     * Test bám vào chốt chặn chứ không bám vào `animationend` vì jsdom không
     * dựng `AnimationEvent`, nên React không gắn được `onAnimationEnd` và
     * đường nhanh không kiểm được ở đây. Đổi lại, đây đúng là kịch bản tệ nhất
     * trên trình duyệt thật: animation bị chặn, chỉ còn chốt chặn cứu.
     */
    render(<SplashScreen />)

    /*
     * Hai nhịp riêng, KHÔNG gộp thành một lần cộng dồn: chốt chặn chỉ được đặt
     * sau khi React commit trạng thái "đang tan", nên gộp lại thì nó vừa mới
     * được hẹn ở đúng mốc thời gian ta vừa nhảy tới và chưa kịp bắn.
     */
    act(() => {
      vi.advanceTimersByTime(MIN_VISIBLE_MS)
    })
    act(() => {
      vi.advanceTimersByTime(FADE_TIMEOUT_MS)
    })

    expect(splash()).toBeNull()
  })

  it('ẩn khỏi screen reader thay vì chặn nội dung thật', () => {
    /*
     * App mount NGAY phía sau lớp phủ. Nếu lớp phủ lộ ra với screen reader thì
     * người dùng đọc một tấm bìa rồi phải điều hướng lại từ đầu khi nó biến mất
     * vài trăm ms sau — tệ hơn hẳn việc đọc thẳng nội dung thật.
     */
    render(<SplashScreen />)

    expect(splash()).toHaveAttribute('aria-hidden')
    // Wordmark KHÔNG được là một heading: mỗi màn đã có đúng một `<h1>` riêng.
    expect(screen.queryByRole('heading')).toBeNull()
  })
})
