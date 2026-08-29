import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VocabularyCard } from '@/components/common/VocabularyCard'
import type { ReviewSessionMeta } from '@/features/review/api'
import type * as historyApi from '@/features/review/history-api'
import type { WeakWord, WordHistory } from '@/features/review/history-api'
import { WordReviewHistory } from '@/features/review/components/WordReviewHistory'
import type { WordSummary } from '@/types/dictionary'
import type * as statsApi from './api'
import type { StatsSummary } from './api'
import { StatsPage } from './pages/StatsPage'

const { fetchSessionHistory, fetchWeakWords, fetchWordHistory } = vi.hoisted(() => ({
  fetchSessionHistory: vi.fn<
    () => Promise<{ items: ReviewSessionMeta[]; nextCursor: string | null }>
  >(),
  fetchWeakWords: vi.fn<() => Promise<{ items: WeakWord[]; nextPage: number | null }>>(),
  fetchWordHistory: vi.fn<(wordId: number) => Promise<WordHistory>>(),
}))

const { fetchStatsSummary } = vi.hoisted(() => ({
  fetchStatsSummary: vi.fn<() => Promise<StatsSummary>>(),
}))

vi.mock('@/features/review/history-api', async (importOriginal) => {
  const actual = await importOriginal<typeof historyApi>()

  return { ...actual, fetchSessionHistory, fetchWeakWords, fetchWordHistory }
})

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof statsApi>()

  return { ...actual, fetchStatsSummary }
})

const word: WordSummary = {
  id: 5,
  simplified: '学习',
  traditional: '學習',
  pinyin: 'xué xí',
  han_viet: 'học tập',
  definitions_en: ['to study'],
  definitions_vi: ['học tập'],
  hsk_level: 1,
}

const weakWord: WeakWord = {
  user_word_id: 3,
  status: 'learning',
  review_count: 8,
  correct_count: 3,
  wrong_count: 5,
  accuracy: 38,
  last_wrong_at: '2026-08-28T10:00:00+07:00',
  next_review_at: null,
  word,
}

const summary: StatsSummary = {
  range: 'week',
  words_learned: 12,
  words_learned_delta_pct: 0,
  reviews_count: 40,
  streak_days: 3,
  memory_rate: 75,
  series: [{ label: '2026-08-29', value: 4 }],
  distribution: { new: 20, learning: 50, mastered: 30 },
}

function renderStats() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )

  return render(<StatsPage />, { wrapper })
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchStatsSummary.mockResolvedValue(summary)
  fetchSessionHistory.mockResolvedValue({ items: [], nextCursor: null })
  fetchWeakWords.mockResolvedValue({ items: [], nextPage: null })
})

describe('trang Thống kê', () => {
  it('hiện mục Từ hay sai khi có dữ liệu', async () => {
    fetchWeakWords.mockResolvedValue({ items: [weakWord], nextPage: null })

    renderStats()

    expect(await screen.findByText('Từ hay sai')).toBeInTheDocument()
    expect(screen.getByText('sai 5 lần')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ôn những từ này' })).toBeInTheDocument()
  })

  it('ẨN HẲN hai mục mới khi chưa có dữ liệu, không hiện khung trống', async () => {
    renderStats()

    // Chờ nội dung chính lên trước rồi mới khẳng định hai mục kia vắng mặt.
    expect(await screen.findByText('Phân loại từ')).toBeInTheDocument()
    expect(screen.queryByText('Từ hay sai')).not.toBeInTheDocument()
    expect(screen.queryByText('Phiên gần đây')).not.toBeInTheDocument()
  })

  it('KHÔNG gọi lại hai endpoint mới khi đổi khoảng thời gian', async () => {
    /*
     * Hai mục này đọc endpoint riêng, không phải `/stats/summary`. Nếu ai đó
     * "sửa" cho chúng theo `range` thì sẽ tạo ra một tham số API không tồn tại.
     */
    fetchWeakWords.mockResolvedValue({ items: [weakWord], nextPage: null })

    const user = userEvent.setup()

    renderStats()
    await screen.findByText('Từ hay sai')

    const callsBefore = fetchWeakWords.mock.calls.length

    /*
     * `userEvent` + `waitFor`, không phải `.click()` DOM thô rồi assert ngay.
     *
     * Refetch của TanStack Query xảy ra trong passive effect + microtask SAU
     * commit, nên một assert đồng bộ sẽ xanh kể cả khi ai đó đổi `useWeakWords`
     * thành `useWeakWords(range)` — tức test canh một thứ mà nó không thể thấy.
     */
    await user.click(screen.getByRole('tab', { name: 'Tháng' }))

    // Chờ tới khi số liệu của kỳ mới đã về, rồi mới khẳng định hai endpoint kia
    // đứng yên.
    await waitFor(() => expect(fetchStatsSummary.mock.calls.length).toBeGreaterThan(1))

    expect(fetchWeakWords.mock.calls.length).toBe(callsBefore)
  })
})

describe('thẻ kho từ', () => {
  it('hiện badge số lần sai khi được truyền vào', () => {
    render(<VocabularyCard word={word} saved wrongCount={4} />)

    expect(screen.getByText('sai 4')).toBeInTheDocument()
  })

  it('KHÔNG hiện badge khi chưa từng sai', () => {
    render(<VocabularyCard word={word} saved wrongCount={0} />)

    expect(screen.queryByText(/^sai /)).not.toBeInTheDocument()
  })

  it('KHÔNG hiện badge ở màn không truyền prop — thẻ tìm kiếm không đổi', () => {
    render(<VocabularyCard word={word} />)

    expect(screen.queryByText(/^sai /)).not.toBeInTheDocument()
  })
})

describe('lịch sử ôn ở màn chi tiết từ', () => {
  function renderHistory(saved: boolean) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    return render(
      <QueryClientProvider client={client}>
        <WordReviewHistory wordId={5} saved={saved} />
      </QueryClientProvider>,
    )
  }

  it('KHÔNG gọi API cho từ chưa lưu', () => {
    renderHistory(false)

    expect(fetchWordHistory).not.toHaveBeenCalled()
  })

  it('hiện số lần ôn, số lần sai và ngày sai gần nhất', async () => {
    fetchWordHistory.mockResolvedValue({
      user_word_id: 3,
      status: 'learning',
      review_count: 8,
      correct_count: 3,
      wrong_count: 5,
      accuracy: 38,
      last_wrong_at: '2026-08-28T10:00:00+07:00',
      last_reviewed_at: '2026-08-29T10:00:00+07:00',
      next_review_at: null,
      recent: [],
    })

    renderHistory(true)

    expect(await screen.findByText('sai 5 lần')).toBeInTheDocument()
    expect(screen.getByText(/Đã ôn 8 lần/)).toBeInTheDocument()
    expect(screen.getByText(/Sai gần nhất/)).toBeInTheDocument()
  })

  it('ẩn dòng "sai gần nhất" khi chưa từng sai lượt đầu', async () => {
    // `last_wrong_at` và `wrong_count` dùng CÙNG bộ lọc ở server, nên hai con số
    // này không thể mâu thuẫn nhau.
    fetchWordHistory.mockResolvedValue({
      user_word_id: 3,
      status: 'reviewing',
      review_count: 4,
      correct_count: 4,
      wrong_count: 0,
      accuracy: 100,
      last_wrong_at: null,
      last_reviewed_at: '2026-08-29T10:00:00+07:00',
      next_review_at: null,
      recent: [],
    })

    renderHistory(true)

    expect(await screen.findByText(/Đã ôn 4 lần/)).toBeInTheDocument()
    expect(screen.queryByText(/Sai gần nhất/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^sai /)).not.toBeInTheDocument()
  })
})
