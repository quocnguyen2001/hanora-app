import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTokenReader } from '@/lib/api'
import type { SentenceDetail } from '@/types/dictionary'
import { SentenceDetailPage } from './SentenceDetailPage'

const fetchMock = vi.fn<typeof fetch>()

const detail: SentenceDetail = {
  zh: '我喜欢学习。',
  pinyin: 'wǒ xǐhuān xuéxí',
  vi: 'Tôi thích học.',
  literal_vi: 'tôi thích học tập',
  tokens: [
    { zh: '我', pinyin: 'wǒ', vi: 'tôi', word_id: 43188 },
    { zh: '喜欢', pinyin: 'xǐhuān', vi: 'thích', word_id: 51 },
    // Dấu câu KHÔNG có trong từ điển — phải render như chữ thường.
    { zh: '。', pinyin: '.', vi: '', word_id: null },
  ],
  grammar_notes: ['喜欢 đứng trước động từ.'],
  source: 'ai',
}

function respond(body: unknown, status = 200): void {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

/** Ghi lại đường điều hướng để khẳng định bấm vào từ là mở đúng trang. */
function Harness({ children, zh }: { children?: ReactNode; zh: string }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/sentence?zh=${encodeURIComponent(zh)}`]}>
        <Routes>
          <Route path="/sentence" element={<SentenceDetailPage />} />
          <Route path="/words/:id" element={<p>trang từ</p>} />
          <Route path="/search" element={<p>trang tìm kiếm</p>} />
        </Routes>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  setTokenReader(null)
})

describe('hiển thị phân tích câu', () => {
  it('hiện câu, pinyin, bản dịch và nghĩa đen', async () => {
    respond({ data: detail, meta: { status: 'ready' } })

    render(<Harness zh={detail.zh} />)

    expect(await screen.findByText('我喜欢学习。')).toBeInTheDocument()
    expect(screen.getByText('wǒ xǐhuān xuéxí')).toBeInTheDocument()
    expect(screen.getByText('Tôi thích học.')).toBeInTheDocument()
    expect(screen.getByText(/tôi thích học tập/)).toBeInTheDocument()
  })

  it('gắn nhãn nguồn AI', async () => {
    respond({ data: detail, meta: { status: 'ready' } })

    render(<Harness zh={detail.zh} />)

    expect(await screen.findByText('AI phân tích')).toBeInTheDocument()
    expect(screen.getByText(/có thể chưa chuẩn/i)).toBeInTheDocument()
  })

  it('hiện ghi chú ngữ pháp', async () => {
    respond({ data: detail, meta: { status: 'ready' } })

    render(<Harness zh={detail.zh} />)

    expect(await screen.findByText('喜欢 đứng trước động từ.')).toBeInTheDocument()
  })

  it('ẩn hẳn khối tách từ khi API trả mảng rỗng', async () => {
    // API bỏ tách từ khi model làm rơi chữ. Hiện một khối trống là nói dối về
    // thứ app biết.
    respond({ data: { ...detail, tokens: [] }, meta: { status: 'ready' } })

    render(<Harness zh={detail.zh} />)

    await screen.findByText('Tôi thích học.')
    expect(screen.queryByText('Từng từ')).not.toBeInTheDocument()
  })
})

describe('bấm vào từ trong câu', () => {
  it('mở trang chi tiết từ khi token có word_id', async () => {
    respond({ data: detail, meta: { status: 'ready' } })
    const user = userEvent.setup()

    render(<Harness zh={detail.zh} />)

    await user.click(await screen.findByRole('button', { name: /喜欢/ }))

    expect(await screen.findByText('trang từ')).toBeInTheDocument()
  })

  it('KHÔNG cho bấm token không có trong từ điển', async () => {
    /*
     * Dấu câu không có `word_id`. Một hàng trông bấm được mà bấm không ra gì tệ
     * hơn một hàng tĩnh — cùng lý do plan đã cắt tab `Hán tự` khỏi MVP.
     */
    respond({ data: detail, meta: { status: 'ready' } })

    render(<Harness zh={detail.zh} />)

    await screen.findByText('我喜欢学习。')
    expect(screen.queryByRole('button', { name: /。/ })).not.toBeInTheDocument()
  })
})

describe('suy giảm êm', () => {
  it('hiện lỗi có nút thử lại khi API trả data null', async () => {
    // API trả HTTP 200 kèm `data: null` khi phân tích hỏng — client biến nó
    // thành lỗi để trang chỉ có MỘT đường xử lý.
    respond({ data: null, meta: { status: 'unavailable' } })

    render(<Harness zh={detail.zh} />)

    expect(await screen.findByText(/chưa phân tích được câu này/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })

  it('gọi lại API khi bấm Thử lại', async () => {
    respond({ data: null, meta: { status: 'unavailable' } })
    const user = userEvent.setup()

    render(<Harness zh={detail.zh} />)

    await user.click(await screen.findByRole('button', { name: 'Thử lại' }))

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1))
  })

  it('KHÔNG tự thử lại — mỗi lần là một lời gọi Gemini tốn tiền', async () => {
    respond({ data: null, meta: { status: 'unavailable' } })

    render(<Harness zh={detail.zh} />)

    await screen.findByRole('button', { name: 'Thử lại' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('báo thiếu câu khi mở trang không có tham số zh', async () => {
    render(<Harness zh="" />)

    expect(await screen.findByText(/thiếu câu cần tra/i)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
