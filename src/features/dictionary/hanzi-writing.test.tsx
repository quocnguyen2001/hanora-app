import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTokenReader } from '@/lib/api'
import { useDisplay } from '@/stores/display'
import { HanziWritingSheet } from './components/HanziWritingSheet'

/*
 * `hanzi-writer` vẽ SVG thật và cần layout, thứ jsdom không có. Giả lập chunk
 * lười để test được PHẦN quyết định của sheet: khi nào gọi API, ba nhánh dữ
 * liệu, và cờ giảm chuyển động truyền xuống có đúng không.
 *
 * Bản thân việc vẽ nét thuộc về kiểm chứng thủ công ở Phase 8 — nó là thao tác
 * thị giác-vận động và không có test tự động nào thay được.
 */
vi.mock('./components/HanziWritingPad', () => ({
  HanziWritingPad: ({ data, reduceMotion }: { data: { char: string }; reduceMotion: boolean }) => (
    <div data-testid="pad" data-char={data.char} data-reduce-motion={String(reduceMotion)} />
  ),
}))

const fetchMock = vi.fn<typeof fetch>()

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const strokes = {
  data: { char: '学', strokes: ['M 1', 'M 2'], medians: [[[1, 2]], [[3, 4]]] },
}

function Harness({ open }: { open: boolean }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return (
    <QueryClientProvider client={client}>
      <HanziWritingSheet char="学" open={open} onClose={() => {}} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  useDisplay.setState({ motion: 'full' })
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  setTokenReader(null)
})

describe('sheet tập viết', () => {
  it('KHÔNG gọi API khi sheet đóng', async () => {
    // `enabled: open` là bắt buộc, không phải tối ưu: thiếu nó thì mọi thẻ chữ
    // trên màn tải ~4 KB hình học ngay khi render — đúng cái mà việc tách
    // endpoint này vừa loại bỏ.
    fetchMock.mockResolvedValue(json(strokes))

    render(<Harness open={false} />)

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('tải nét và render bảng vẽ khi mở', async () => {
    fetchMock.mockResolvedValue(json(strokes))

    render(<Harness open />)

    const pad = await screen.findByTestId('pad')
    expect(pad).toHaveAttribute('data-char', '学')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('404 nói "chưa có dữ liệu nét", KHÔNG nói lỗi mạng', async () => {
    // 2.763/9.574 chữ không có nét — phần lớn là phồn thể. Đó là câu trả lời,
    // không phải sự cố.
    fetchMock.mockResolvedValue(json({ message: 'không có' }, 404))

    render(<Harness open />)

    expect(await screen.findByText(/chưa có dữ liệu nét/i)).toBeInTheDocument()
    expect(screen.queryByTestId('pad')).not.toBeInTheDocument()
  })

  it('lỗi mạng nói CẦN KẾT NỐI, không nói chữ thiếu dữ liệu', async () => {
    // Nói "chữ này không có nét" khi thật ra mất mạng là nói dối người dùng.
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    render(<Harness open />)

    expect(await screen.findByText(/Cần kết nối/i)).toBeInTheDocument()
    expect(screen.queryByText(/chưa có dữ liệu nét/i)).not.toBeInTheDocument()
  })

  it('ghi công Arphic License có mặt', async () => {
    // Nghĩa vụ của bộ dữ liệu nét, cùng khuôn mà Tatoeba và Pixabay đang giữ.
    fetchMock.mockResolvedValue(json(strokes))

    render(<Harness open />)

    await screen.findByTestId('pad')
    expect(screen.getByText(/Arphic Public License/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Make Me a Hanzi/ })).toBeInTheDocument()
  })
})

describe('giảm chuyển động', () => {
  it('truyền cờ khi người dùng chọn trong app', async () => {
    // `hanzi-writer` vẽ bằng JS nên block `animation-duration: 0.01ms` của
    // `app.css` KHÔNG chạm tới nó. Đây là chốt duy nhất, và không test nào
    // hiện có bắt được nếu nó biến mất.
    useDisplay.setState({ motion: 'reduced' })
    fetchMock.mockResolvedValue(json(strokes))

    render(<Harness open />)

    await waitFor(() =>
      expect(screen.getByTestId('pad')).toHaveAttribute('data-reduce-motion', 'true'),
    )
  })

  it('không bật cờ khi cả hai nguồn đều tắt', async () => {
    fetchMock.mockResolvedValue(json(strokes))

    render(<Harness open />)

    await waitFor(() =>
      expect(screen.getByTestId('pad')).toHaveAttribute('data-reduce-motion', 'false'),
    )
  })
})
