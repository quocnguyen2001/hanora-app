import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { useReviewStore } from '@/stores/review'
import type * as reviewApi from './api'
import type { AnswerResult, ReviewSessionMeta, StartedSession } from './api'
import type { SessionConfig } from './components/ModePicker'
import type * as historyApi from './history-api'
import type { SessionDetail } from './history-api'
import { ReviewPage } from './pages/ReviewPage'

/*
 * Mock TỪNG HÀM, giữ nguyên phần còn lại của module: `isMcqItem` và các kiểu
 * vẫn phải là bản thật, nếu không test sẽ kiểm một hàng giả.
 *
 * `vi.hoisted` là bắt buộc, không phải phong cách: `vi.mock` được nâng lên đầu
 * file, nên một `const` khai báo bình thường sẽ CHƯA khởi tạo lúc factory chạy
 * và cả file ném `Cannot access before initialization`.
 *
 * Generic của `vi.fn` khai kiểu trả về để mock không rò `any` vào chỗ gọi — một
 * mock trả `any` làm mọi assertion sau nó mất kiểm tra kiểu.
 */
const { startSession, submitAnswer, finishSession } = vi.hoisted(() => ({
  startSession: vi.fn<(input: SessionConfig) => Promise<StartedSession>>(),
  submitAnswer: vi.fn<(input: Record<string, unknown>) => Promise<AnswerResult>>(),
  finishSession: vi.fn<(id: number) => Promise<SessionDetail>>(),
}))

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof reviewApi>()

  return { ...actual, startSession, submitAnswer }
})

vi.mock('./history-api', async (importOriginal) => {
  const actual = await importOriginal<typeof historyApi>()

  return { ...actual, finishSession }
})

const session: ReviewSessionMeta = {
  id: 7,
  mode: 'typing',
  source: 'due',
  planned_count: 1,
  answered_count: 0,
  correct_count: 0,
  score: null,
  grade: null,
  duration_seconds: null,
  started_at: '2026-08-29T10:00:00+07:00',
  finished_at: null,
}

const started: StartedSession = {
  session,
  items: [{ user_word_id: 3, prompt_han_viet: 'học tập', hint: { char_count: 2 } }],
  empty_reason: null,
}

const answerResult: AnswerResult = {
  correct: true,
  correct_answer: { word_id: 1, simplified: '学习', pinyin: 'xué xí', han_viet: 'học tập' },
  next_review_at: null,
  status: 'learning',
  is_retry: false,
  session: { ...session, answered_count: 1, correct_count: 1 },
}

const outcome: SessionDetail = {
  session: {
    ...session,
    answered_count: 1,
    correct_count: 1,
    score: 100,
    grade: 'excellent',
    duration_seconds: 42,
    finished_at: '2026-08-29T10:00:42+07:00',
  },
  answers: [],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  /*
   * `StrictMode` là BẮT BUỘC ở đây, không phải trang trí.
   *
   * `src/main.tsx` bọc app thật trong nó, và nó gọi updater của `useState` hai
   * lần ở dev đúng để lộ ra side effect nằm nhầm chỗ. Không có nó, một
   * `finishNow()` gọi bên trong updater vẫn cho `toHaveBeenCalledTimes(1)` xanh
   * trong khi app thật bắn hai request.
   */
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    </StrictMode>
  )

  return render(<ReviewPage />, { wrapper })
}

beforeEach(() => {
  vi.clearAllMocks()
  useReviewStore.setState({ lastMode: 'typing', lastSource: 'due', lastLimit: 10 })
  startSession.mockResolvedValue(started)
  submitAnswer.mockResolvedValue(answerResult)
  finishSession.mockResolvedValue(outcome)
})

describe('mở phiên', () => {
  it('gửi đúng chế độ, nguồn và số thẻ đã chọn', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('radio', { name: /Từ hay sai/ }))
    await user.click(screen.getByRole('radio', { name: '20' }))
    await user.click(screen.getByText('Gõ lại'))

    // Kiểm THAM SỐ ĐẦU: TanStack Query truyền thêm context làm tham số thứ hai,
    // nên `toHaveBeenCalledWith` sẽ so cả thứ không thuộc về hợp đồng của ta.
    await waitFor(() => expect(startSession).toHaveBeenCalled())

    expect(startSession.mock.calls[0]?.[0]).toEqual({
      mode: 'typing',
      source: 'weak',
      limit: 20,
    })
  })

  it('chỉ bắn MỘT request dù bấm kép', async () => {
    /*
     * `useMutation` không dedupe như `useQuery`. Hai request đồng thời sẽ khiến
     * phiên sau chốt phiên trước trong khi app giữ id phiên trước, rồi mọi lượt
     * nộp tiếp theo trả 409.
     */
    const user = userEvent.setup()
    startSession.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(started), 50)),
    )

    renderPage()

    const card = screen.getByText('Gõ lại')
    await user.dblClick(card)

    await waitFor(() => expect(startSession).toHaveBeenCalledTimes(1))
  })
})

describe('trạng thái rỗng', () => {
  it('nói đúng sự thật khi không dựng được câu trắc nghiệm', async () => {
    // KHÔNG được nói "chưa có từ nào bạn từng sai" — người dùng CÓ từ, chỉ là
    // kho quá mỏng để tạo 4 lựa chọn.
    const user = userEvent.setup()
    startSession.mockResolvedValue({
      session: null,
      items: [],
      empty_reason: 'not_enough_options',
    })

    renderPage()
    await user.click(screen.getByText('Trắc nghiệm'))

    expect(await screen.findByText(/Chưa dựng được câu trắc nghiệm/)).toBeInTheDocument()
    expect(screen.getByText(/Thử chế độ Gõ lại/)).toBeInTheDocument()
  })

  it('phân biệt với trường hợp thật sự không có từ nào', async () => {
    const user = userEvent.setup()
    startSession.mockResolvedValue({ session: null, items: [], empty_reason: 'no_words' })

    renderPage()
    await user.click(screen.getByText('Gõ lại'))

    expect(await screen.findByText(/Chưa có từ nào để ôn/)).toBeInTheDocument()
  })
})

describe('nộp bài', () => {
  it('KHÔNG gửi is_retry — server tự suy', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByText('Gõ lại'))
    await user.type(await screen.findByRole('textbox'), '学习')
    await user.keyboard('{Enter}')

    await waitFor(() => expect(submitAnswer).toHaveBeenCalled())

    const payload = submitAnswer.mock.calls[0]?.[0]

    expect(payload).not.toHaveProperty('is_retry')
    expect(payload?.review_session_id).toBe(7)
  })

  it('chốt phiên đúng một lần khi hết thẻ và hiện điểm từ server', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByText('Gõ lại'))
    await user.type(await screen.findByRole('textbox'), '学习')
    await user.keyboard('{Enter}')

    await user.click(await screen.findByRole('button', { name: /Tiếp tục|Câu tiếp/i }))

    await waitFor(() => expect(finishSession).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('100')).toBeInTheDocument()
    expect(screen.getByText('Xuất sắc')).toBeInTheDocument()
  })
})

describe('lỗi', () => {
  it('409 hiện thông báo phiên đã kết thúc, không kẹt màn', async () => {
    const user = userEvent.setup()
    submitAnswer.mockRejectedValue(new ApiError('Phiên ôn này đã kết thúc.', 409))

    renderPage()
    await user.click(screen.getByText('Gõ lại'))
    await user.type(await screen.findByRole('textbox'), '学习')
    await user.keyboard('{Enter}')

    expect(await screen.findByText(/Phiên ôn này đã kết thúc/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bắt đầu phiên mới/ })).toBeInTheDocument()
  })

  it('lỗi mạng khi chốt phiên KHÔNG để màn kẹt ở khung xương', async () => {
    /*
     * Không có nhánh lỗi này thì hàng đợi rỗng + chưa có kết quả rơi vào khung
     * xương và đứng đó vĩnh viễn — không thông báo, không nút, dù điểm đã an
     * toàn trên server.
     */
    const user = userEvent.setup()
    finishSession.mockRejectedValue(new ApiError('Mất kết nối.', 0))

    renderPage()
    await user.click(screen.getByText('Gõ lại'))
    await user.type(await screen.findByRole('textbox'), '学习')
    await user.keyboard('{Enter}')
    await user.click(await screen.findByRole('button', { name: /Tiếp tục|Câu tiếp/i }))

    expect(await screen.findByText(/Không chốt được phiên/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })
})
