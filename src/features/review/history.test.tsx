import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import type { ReviewSessionMeta } from './api'
import type * as historyApi from './history-api'
import type { SessionDetail } from './history-api'
import { ReviewHistoryPage } from './pages/ReviewHistoryPage'
import { ReviewSessionDetailPage } from './pages/ReviewSessionDetailPage'

const { fetchSessionHistory, fetchSessionDetail } = vi.hoisted(() => ({
  fetchSessionHistory: vi.fn<
    (cursor?: string | null) => Promise<{ items: ReviewSessionMeta[]; nextCursor: string | null }>
  >(),
  fetchSessionDetail: vi.fn<(id: number) => Promise<SessionDetail>>(),
}))

vi.mock('./history-api', async (importOriginal) => {
  const actual = await importOriginal<typeof historyApi>()

  return { ...actual, fetchSessionHistory, fetchSessionDetail }
})

const session: ReviewSessionMeta = {
  id: 12,
  mode: 'typing',
  source: 'weak',
  planned_count: 10,
  answered_count: 8,
  correct_count: 6,
  score: 75,
  grade: 'good',
  duration_seconds: 300,
  started_at: '2026-08-29T09:00:00+07:00',
  finished_at: '2026-08-29T09:05:00+07:00',
}

function renderWithRouter(ui: ReactNode, path = '/review/history') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchSessionHistory.mockResolvedValue({ items: [session], nextCursor: null })
  fetchSessionDetail.mockResolvedValue({
    session,
    answers: [
      {
        id: 1,
        user_word_id: 3,
        mode: 'typing',
        is_correct: false,
        is_retry: false,
        answer_raw: 'xuexi',
        duration_ms: 8_200,
        answered_at: '2026-08-29T09:01:00+07:00',
        word: { id: 5, simplified: '学习', pinyin: 'xué xí', han_viet: 'học tập' },
      },
      {
        id: 2,
        user_word_id: 3,
        mode: 'typing',
        is_correct: true,
        is_retry: true,
        answer_raw: '学习',
        duration_ms: 3_100,
        answered_at: '2026-08-29T09:02:00+07:00',
        word: { id: 5, simplified: '学习', pinyin: 'xué xí', han_viet: 'học tập' },
      },
    ],
  })
})

describe('trang lịch sử', () => {
  it('hiện điểm, xếp loại và nhãn nguồn của từng phiên', async () => {
    renderWithRouter(<ReviewHistoryPage />)

    expect(await screen.findByText('75')).toBeInTheDocument()
    expect(screen.getByText('Giỏi')).toBeInTheDocument()
    expect(screen.getByText('Từ hay sai')).toBeInTheDocument()
    expect(screen.getByText(/Đúng 6\/8/)).toBeInTheDocument()
  })

  it('bấm một phiên thì mở trang chi tiết của đúng phiên đó', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      <Routes>
        <Route path="/review/history" element={<ReviewHistoryPage />} />
        <Route path="/review/history/:id" element={<ReviewSessionDetailPage />} />
      </Routes>,
    )

    await user.click(await screen.findByText('75'))

    expect(await screen.findByText(/Chi tiết \d+ lượt/)).toBeInTheDocument()
    expect(fetchSessionDetail).toHaveBeenCalledWith(12)
  })

  it('nói rõ cần kết nối khi chưa có phiên nào', async () => {
    fetchSessionHistory.mockResolvedValue({ items: [], nextCursor: null })

    renderWithRouter(<ReviewHistoryPage />)

    expect(await screen.findByText(/Chưa có phiên ôn nào/)).toBeInTheDocument()
  })
})

describe('chi tiết phiên', () => {
  /*
   * Render QUA `<Route path="/review/history/:id">`, không render component
   * trần: `useParams()` chỉ có giá trị khi có route khớp. Render trần cho
   * `id === undefined`, và test khi đó xanh mà không bao giờ đọc tới id — mock
   * trả về cùng một phiên bất kể tham số.
   */
  function renderDetail(path = '/review/history/12') {
    return renderWithRouter(
      <Routes>
        <Route path="/review/history/:id" element={<ReviewSessionDetailPage />} />
      </Routes>,
      path,
    )
  }

  it('đánh dấu lượt làm lại để người dùng không tự cộng ra con số khác', async () => {
    renderDetail()

    expect(await screen.findByText('làm lại')).toBeInTheDocument()
    // Lượt sai hiện đáp án đã gõ; lượt đúng thì không cần.
    expect(screen.getByText('xuexi')).toBeInTheDocument()
    expect(fetchSessionDetail).toHaveBeenCalledWith(12)
  })

  it('hiện điểm phiên bằng cùng component với màn tổng kết', async () => {
    renderDetail()

    expect(await screen.findByText('75')).toBeInTheDocument()
    expect(screen.getByText('Giỏi')).toBeInTheDocument()
  })

  it('KHÔNG gọi API với id không phải số', async () => {
    // `Number('abc')` là `NaN`: serialize thành `null` trong query key và sinh
    // một request tới `/reviews/sessions/NaN`.
    renderDetail('/review/history/abc')

    expect(await screen.findByText(/Đường dẫn không hợp lệ/)).toBeInTheDocument()
    expect(fetchSessionDetail).not.toHaveBeenCalled()
  })
})

describe('khung xương chờ', () => {
  it('trang lịch sử KHÔNG dùng khung xương của thẻ ôn tập', () => {
    /*
     * `'/review/history'.startsWith('/review')` cũng đúng, nên nếu nhánh
     * `/review` đứng trước thì trang lịch sử sẽ nháy qua một thẻ ôn tập giả với
     * 4 ô lựa chọn rồi mới nhảy sang danh sách.
     */
    const { container: history } = render(<PageSkeleton pathname="/review/history" />)
    const { container: review } = render(<PageSkeleton pathname="/review" />)

    expect(history.innerHTML).not.toBe(review.innerHTML)
  })
})
