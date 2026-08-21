import { beforeEach, describe, expect, it } from 'vitest'
import { useSearchMode } from './search-mode'
import { useAuthStore } from '@/stores/auth'
import { clearSession } from '@/lib/session'

beforeEach(() => {
  useSearchMode.setState({ mode: null })
  window.localStorage.clear()
})

describe('mode tìm kiếm', () => {
  it('mặc định là CHƯA CHỌN, không phải tiếng Việt', () => {
    /*
     * Mặc định `vi` làm hỏng tìm pinyin cho mọi người dùng ngay lần mở đầu:
     * `xuexi` chỉ còn 1 kết quả, `ni hao` trả 653 dòng đứng đầu là 着/用/吃 —
     * và vì `total > 0` nên gợi ý đổi mode không hề hiện.
     *
     * `null` thì không gửi `mode` và API chạy đường auto như trước.
     */
    expect(useSearchMode.getState().mode).toBeNull()
  })

  it('ghi lựa chọn xuống localStorage để sống qua reload', () => {
    useSearchMode.getState().setMode('cn')

    expect(useSearchMode.getState().mode).toBe('cn')
    expect(window.localStorage.getItem('hanora.search-mode')).toContain('cn')
  })

  it('KHÔNG bị xóa khi đăng xuất', async () => {
    /*
     * Khác lịch sử tìm kiếm — thứ đã được thêm vào `clearSession()` vì nó là nội
     * dung người dùng gõ và rò sang tài khoản sau trên máy dùng chung.
     *
     * Mode chỉ là tùy chọn giao diện của thiết bị. Xóa nó khi đăng xuất là bắt
     * người dùng chọn lại mỗi lần đăng nhập, không đổi lấy được gì.
     */
    useSearchMode.getState().setMode('cn')
    useAuthStore.setState({ token: 'token-cu' })

    await clearSession()

    expect(useSearchMode.getState().mode).toBe('cn')
  })
})
