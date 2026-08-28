import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SearchTranslation } from '@/types/dictionary'
import { TranslationCard } from './TranslationCard'

const translation: SearchTranslation = {
  zh: '你还记得我吗？',
  pinyin: 'nǐ hái jìde wǒ ma?',
  vi: 'bạn có nhớ tôi không?',
  source: 'ai',
}

describe('TranslationCard', () => {
  it('hiện câu tiếng Trung và pinyin', () => {
    render(<TranslationCard translation={translation} />)

    expect(screen.getByText('你还记得我吗？')).toBeInTheDocument()
    expect(screen.getByText('nǐ hái jìde wǒ ma?')).toBeInTheDocument()
  })

  it('gắn nhãn nguồn AI', () => {
    /*
     * Nhãn này KHÔNG phải trang trí. Mọi dòng khác trên màn tìm kiếm đến từ từ
     * điển có nguồn; dòng này do máy dịch, không có người rà, và người học không
     * có cách nào tự kiểm. Bỏ nhãn đi là để nội dung máy sinh trà trộn vào dữ
     * liệu đã kiểm chứng.
     */
    render(<TranslationCard translation={translation} />)

    expect(screen.getByText('AI dịch')).toBeInTheDocument()
    expect(screen.getByText(/có thể chưa chuẩn/i)).toBeInTheDocument()
  })

  it('đánh dấu chữ Hán bằng lang zh-Hans', () => {
    // Cùng một codepoint được vẽ khác nhau giữa tiếng Trung, Nhật và Hàn.
    render(<TranslationCard translation={translation} />)

    expect(screen.getByText('你还记得我吗？')).toHaveAttribute('lang', 'zh-Hans')
  })

  it('có nút phát âm', () => {
    render(<TranslationCard translation={translation} />)

    // `unsupported` trong jsdom (không có Web Speech API) — nút vẫn phải tồn tại
    // và nói rõ lý do thay vì biến mất.
    expect(
      screen.getByRole('button', { name: /phát âm|không hỗ trợ/i }),
    ).toBeInTheDocument()
  })

  it('KHÔNG có nút lưu — câu dịch không lưu được vào kho từ', () => {
    render(<TranslationCard translation={translation} />)

    expect(screen.queryByRole('button', { name: /lưu/i })).not.toBeInTheDocument()
  })
})

describe('bấm để mở phân tích câu', () => {
  it('gọi onSelect khi bấm vào phần nội dung', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()

    render(<TranslationCard translation={translation} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: /phân tích câu/i }))

    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('nút phát âm nằm NGOÀI nút nội dung', () => {
    /*
     * Nút lồng trong nút là HTML không hợp lệ, và hệ quả thấy được là bấm loa
     * thì nhảy sang trang khác. Khẳng định thẳng vào cấu trúc DOM thay vì mô
     * phỏng cú bấm: nút loa ở trạng thái `unsupported` trong jsdom nên một cú
     * bấm giả sẽ xanh vì lý do sai.
     */
    render(<TranslationCard translation={translation} onSelect={vi.fn()} />)

    const content = screen.getByRole('button', { name: /phân tích câu/i })
    const audio = screen.getByRole('button', { name: /phát âm|không hỗ trợ/i })

    expect(content.contains(audio)).toBe(false)
  })

  it('không bấm được khi không có onSelect', () => {
    render(<TranslationCard translation={translation} />)

    expect(screen.getByRole('button', { name: /phân tích câu/i })).toBeDisabled()
  })
})
