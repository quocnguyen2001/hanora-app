import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import type * as topicsApi from './api'
import type { Topic, TopicWord, TopicWordsPage } from './api'
import { TopicLearnPage } from './pages/TopicLearnPage'
import { TopicsPage } from './pages/TopicsPage'

const { fetchTopics, fetchTopicWords, fetchSkippedWordIds, skipWord } = vi.hoisted(() => ({
  fetchTopics: vi.fn<() => Promise<Topic[]>>(),
  fetchTopicWords: vi.fn<(slug: string) => Promise<TopicWordsPage>>(),
  fetchSkippedWordIds: vi.fn<() => Promise<number[]>>(),
  skipWord: vi.fn<(id: number) => Promise<{ word_id: number }>>(),
}))

const { fetchSavedWordIds, saveWord } = vi.hoisted(() => ({
  fetchSavedWordIds: vi.fn<() => Promise<number[]>>(),
  saveWord: vi.fn<(id: number) => Promise<unknown>>(),
}))

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof topicsApi>()),
  fetchTopics,
  fetchTopicWords,
  fetchSkippedWordIds,
  skipWord,
}))

vi.mock('@/features/vocabulary/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchSavedWordIds,
  saveWord,
}))

// Ảnh minh hoạ gọi endpoint riêng; đếm số lần gọi là cách kiểm ngân sách request.
const { fetchWordIllustration } = vi.hoisted(() => ({
  fetchWordIllustration: vi.fn<(id: number) => Promise<unknown>>(),
}))

vi.mock('@/features/dictionary/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchWordIllustration,
}))

function word(id: number, rank: number): TopicWord {
  return {
    id,
    simplified: `字${id}`,
    traditional: `字${id}`,
    pinyin: `zi${id}`,
    han_viet: `âm ${id}`,
    definition_vi: `nghĩa ${id}`,
    definition_en: `meaning ${id}`,
    hsk_level: null,
    rank,
  }
}

function topic(overrides: Partial<Topic> = {}): Topic {
  return {
    slug: 'tinh-yeu',
    name: 'Tình yêu & cảm xúc',
    emoji: '💕',
    word_count: 5,
    processed_count: 0,
    learned_count: 0,
    status: 'ready',
    is_custom: false,
    failed_reason: null,
    ...overrides,
  }
}

function renderLearn(): { location: () => string } {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let path = '/topics/tinh-yeu'

  function Probe(): ReactNode {
    path = useLocation().pathname
    return null
  }

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/topics/tinh-yeu']}>
        <Probe />
        <Routes>
          <Route path="/topics/:slug" element={<TopicLearnPage />} />
          <Route path="/review" element={<p>màn ôn tập</p>} />
          <Route path="/topics" element={<p>danh sách chủ đề</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return { location: () => path }
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchTopics.mockResolvedValue([topic()])
  fetchSkippedWordIds.mockResolvedValue([])
  fetchSavedWordIds.mockResolvedValue([])
  saveWord.mockResolvedValue({})
  skipWord.mockImplementation((id) => Promise.resolve({ word_id: id }))
  fetchWordIllustration.mockResolvedValue({ illustration: null, status: 'none' })
  fetchTopicWords.mockResolvedValue({
    words: [1, 2, 3, 4, 5].map((id) => word(id, id)),
    wordCount: 5,
  })
})

describe('lưới chủ đề', () => {
  function renderGrid(): void {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <TopicsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('hiện tiến độ theo processed_count, không cộng hai bộ đếm', async () => {
    fetchTopics.mockResolvedValue([topic({ word_count: 10, processed_count: 4, learned_count: 3 })])
    renderGrid()

    expect(await screen.findByText('4/10')).toBeInTheDocument()
  })

  it('mảng rỗng có trạng thái RIÊNG, không phải trang trắng', async () => {
    // Quên `topics:import` ở deploy → `GET /topics` trả `[]`. Danh mục nằm ở
    // backend nên app không thể tự dựng 16 thẻ.
    fetchTopics.mockResolvedValue([])
    renderGrid()

    expect(await screen.findByText('Chưa có chủ đề nào.')).toBeInTheDocument()
  })

  it('chủ đề đang sinh KHÔNG trông giống chủ đề rỗng', async () => {
    // Nếu không tách trạng thái, thẻ đang sinh hiện `0/0` và bấm vào là màn "đã
    // học hết" — người dùng vừa tạo xong lại tưởng nó hỏng.
    fetchTopics.mockResolvedValue([
      topic({
        slug: 'phim-anh',
        name: 'Phim ảnh',
        status: 'generating',
        is_custom: true,
        word_count: 0,
      }),
    ])
    renderGrid()

    expect(await screen.findByText('Đang tìm từ…')).toBeInTheDocument()
    expect(screen.queryByText('0/0')).not.toBeInTheDocument()
    // Không có link: chưa có gì để học.
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('chủ đề hỏng nói rõ lý do và cho xoá', async () => {
    fetchTopics.mockResolvedValue([
      topic({
        slug: 'phim-anh',
        name: 'Phim ảnh',
        status: 'failed',
        is_custom: true,
        failed_reason: 'rate_limited',
        word_count: 0,
      }),
    ])
    renderGrid()

    expect(await screen.findByText(/Hệ thống đang bận/)).toBeInTheDocument()
    // Không có nút xoá thì chủ đề hỏng giữ một suất trong trần 20 vĩnh viễn.
    expect(screen.getByRole('button', { name: 'Xoá' })).toBeInTheDocument()
  })

  it('chủ đề GỐC không có nút xoá', async () => {
    fetchTopics.mockResolvedValue([topic({ is_custom: false })])
    renderGrid()

    await screen.findByText('0/5')
    expect(screen.queryByRole('button', { name: 'Xoá' })).not.toBeInTheDocument()
  })

  it('ngoại tuyến nói rõ lý do', async () => {
    fetchTopics.mockRejectedValue(new ApiError('offline', 0, {}, { code: 'network_error' }))
    renderGrid()

    expect(await screen.findByText('Đang ngoại tuyến')).toBeInTheDocument()
  })
})

describe('màn học thẻ', () => {
  it('chỉ bốc thẻ sau khi bấm Bắt đầu, khi cả ba query đã xong', async () => {
    const user = userEvent.setup()
    renderLearn()

    // `useState` khởi tạo lười sẽ bốc ở render đầu — lúc đó ba query còn pending
    // và bộ thẻ sẽ rỗng, rơi thẳng vào màn "đã học hết".
    expect(await screen.findByRole('button', { name: /Bắt đầu học/ })).toBeInTheDocument()
    expect(screen.getByText(/Còn/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Bắt đầu học/ }))

    expect(await screen.findByText('Thẻ 1/5')).toBeInTheDocument()
  })

  it('không đưa từ đã lưu hoặc đã bỏ qua vào phiên', async () => {
    fetchSavedWordIds.mockResolvedValue([1, 2])
    fetchSkippedWordIds.mockResolvedValue([3])
    const user = userEvent.setup()
    renderLearn()

    await user.click(await screen.findByRole('button', { name: /Bắt đầu học/ }))

    expect(await screen.findByText('Thẻ 1/2')).toBeInTheDocument()
  })

  it('KHÔNG optimistic: lỗi mạng giữ thẻ tại chỗ', async () => {
    saveWord.mockRejectedValue(new ApiError('offline', 0, {}, { code: 'offline_write' }))
    const user = userEvent.setup()
    renderLearn()

    await user.click(await screen.findByRole('button', { name: /Bắt đầu học/ }))
    await user.click(screen.getByRole('button', { name: 'Thêm vào kho' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/ngoại tuyến/i)
    // Vẫn ở thẻ 1: nhảy thẻ rồi báo lỗi là để người dùng tin đã lưu 6 từ trong
    // khi kho trống.
    expect(screen.getByText('Thẻ 1/5')).toBeInTheDocument()
  })

  it('sang thẻ sau khi lưu thành công', async () => {
    const user = userEvent.setup()
    renderLearn()

    await user.click(await screen.findByRole('button', { name: /Bắt đầu học/ }))
    await user.click(screen.getByRole('button', { name: 'Thêm vào kho' }))

    expect(await screen.findByText('Thẻ 2/5')).toBeInTheDocument()
  })

  it('chủ đề hết từ → "đã học hết", không màn trống', async () => {
    fetchSavedWordIds.mockResolvedValue([1, 2, 3, 4, 5])
    renderLearn()

    expect(await screen.findByText(/đã học hết chủ đề này/i)).toBeInTheDocument()
  })

  it('tổng kết dẫn sang màn ôn tập', async () => {
    fetchTopicWords.mockResolvedValue({ words: [word(1, 1)], wordCount: 1 })
    const user = userEvent.setup()
    const { location } = renderLearn()

    await user.click(await screen.findByRole('button', { name: /Bắt đầu học/ }))
    await user.click(screen.getByRole('button', { name: 'Thêm vào kho' }))

    expect(await screen.findByText(/Xong phiên này/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Ôn ngay/ }))
    await waitFor(() => expect(location()).toBe('/review'))
  })

  it('không chúc mừng chuỗi lần thứ hai ở phiên kế tiếp trong cùng ngày', async () => {
    /*
     * `streakAdvanced` là state của TRANG, không phải của phiên. Không reset nó
     * trong `begin()` thì bấm "Học tiếp chủ đề này" sau khi chuỗi đã tăng sẽ
     * chúc mừng lại cho một phiên không làm chuỗi nhích.
     *
     * Màn ôn tập miễn nhiễm vì nó đọc `finish.data` của từng mutation; màn này
     * giữ state nên nó phải tự dọn.
     */
    // 12 từ: phiên đầu lấy 10 (SESSION_SIZE), còn dư 2 nên nút "Học tiếp" hiện.
    const words = Array.from({ length: 12 }, (_, i) => word(i + 1, i + 1))
    fetchTopicWords.mockResolvedValue({ words, wordCount: 12 })
    saveWord.mockResolvedValue({
      word: { id: 1 },
      streak: { current: 3, met_today: true, advanced: true },
    })

    const user = userEvent.setup()
    renderLearn()

    await user.click(await screen.findByRole('button', { name: /Bắt đầu học/ }))

    // Thẻ đầu lưu (chuỗi tăng), chín thẻ còn lại bỏ qua cho nhanh.
    await user.click(screen.getByRole('button', { name: 'Thêm vào kho' }))
    for (let i = 0; i < 9; i++) {
      await user.click(screen.getByRole('button', { name: 'Đã biết rồi' }))
    }

    expect(await screen.findByText(/Xong phiên này/)).toBeInTheDocument()
    expect(screen.getByText(/Chuỗi 3 ngày/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Học tiếp chủ đề này/ }))

    // `fetchSavedWordIds`/`fetchSkippedWordIds` là mock tĩnh nên phiên hai lại
    // lấy đủ 10 thẻ — bỏ qua hết để tới màn tổng kết.
    await user.click(await screen.findByRole('button', { name: 'Đã biết rồi' }))
    for (let i = 0; i < 9; i++) {
      await user.click(screen.getByRole('button', { name: 'Đã biết rồi' }))
    }

    expect(await screen.findByText(/Xong phiên này/)).toBeInTheDocument()
    expect(screen.queryByText(/Chuỗi 3 ngày/)).not.toBeInTheDocument()
  })

  it('mỗi thẻ chỉ resolve ảnh của CHÍNH nó, không tải trước thẻ sau', async () => {
    const user = userEvent.setup()
    renderLearn()

    await user.click(await screen.findByRole('button', { name: /Bắt đầu học/ }))
    await screen.findByText('Thẻ 1/5')

    // Một phiên 10 thẻ với prefetch là 10 lượt resolve cho những từ người dùng
    // có thể thoát trước khi nhìn thấy. Trần throttle của API là 60/phút.
    await waitFor(() => expect(fetchWordIllustration).toHaveBeenCalledTimes(1))
  })
})
