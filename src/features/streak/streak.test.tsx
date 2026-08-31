import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth'
import type * as authApi from '@/features/auth/api'
import type * as vocabularyApi from '@/features/vocabulary/api'
import type * as streakApi from './api'
import { parseStreakDelta, type StreakSnapshot } from './api'
import { StreakCalendar } from './components/StreakCalendar'
import { StreakChip } from './components/StreakChip'
import { useSaveTopicWord } from '@/features/topics/hooks'

const { fetchStreak, me, saveWord } = vi.hoisted(() => ({
  fetchStreak: vi.fn<() => Promise<StreakSnapshot>>(),
  me: vi.fn<() => Promise<unknown>>(),
  saveWord: vi.fn<(id: number) => Promise<unknown>>(),
}))

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof streakApi>()),
  fetchStreak,
}))

vi.mock('@/features/auth/api', async (importOriginal) => ({
  ...(await importOriginal<typeof authApi>()),
  me,
}))

vi.mock('@/features/vocabulary/api', async (importOriginal) => ({
  ...(await importOriginal<typeof vocabularyApi>()),
  saveWord,
}))

const snapshot: StreakSnapshot = {
  current: 12,
  longest: 30,
  met_today: false,
  today: { words_added: 2, session_finished: false, words_goal: 5 },
}

function renderChip() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <StreakChip />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ token: 'test-token' })
  me.mockResolvedValue({ user: { id: 1, name: 'a', email: 'a@b.c', created_at: null } })
})

describe('StreakChip', () => {
  it('hiện số và nói rõ trạng thái hôm nay cho screen reader', async () => {
    fetchStreak.mockResolvedValue(snapshot)

    renderChip()

    const link = await screen.findByRole('link', {
      name: 'Chuỗi 12 ngày, hôm nay chưa đạt mục tiêu',
    })

    expect(link).toHaveTextContent('12')
    expect(link).toHaveAttribute('href', '/streak')
  })

  it('đổi nhãn khi đã đạt mục tiêu hôm nay', async () => {
    fetchStreak.mockResolvedValue({ ...snapshot, met_today: true })

    renderChip()

    await screen.findByRole('link', { name: 'Chuỗi 12 ngày, hôm nay đã đạt mục tiêu' })
  })

  it('ẩn hẳn khi người dùng chưa có chuỗi nào', async () => {
    fetchStreak.mockResolvedValue({ ...snapshot, current: 0, longest: 0 })

    renderChip()

    await waitFor(() => expect(fetchStreak).toHaveBeenCalled())
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('vẫn hiện số từ /auth/me khi /streak hỏng — đường ngoại tuyến', async () => {
    /*
     * `/api/auth/me` được service worker cache còn `/api/streak` thì `no-store`,
     * nên đây là đường DUY NHẤT chip có số khi mở app lúc mất mạng. Bỏ nhánh
     * này thì người đang giữ chuỗi 40 ngày mở app ngoại tuyến và thấy chip biến
     * mất.
     */
    fetchStreak.mockRejectedValue(new Error('offline'))
    me.mockResolvedValue({
      user: { id: 1, name: 'a', email: 'a@b.c', created_at: null },
      streak: { current: 40, met_today: true },
    })

    renderChip()

    await screen.findByRole('link', { name: 'Chuỗi 40 ngày, hôm nay đã đạt mục tiêu' })
  })

  it('ẩn khi cả hai nguồn đều không có số', async () => {
    fetchStreak.mockRejectedValue(new Error('offline'))

    renderChip()

    await waitFor(() => expect(fetchStreak).toHaveBeenCalled())
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('đường dây thật: lưu từ ở màn chủ đề → chip nhích, không thêm request', () => {
  it('đi qua useSaveTopicWord, không phải một Harness gọi thẳng useApplyStreak', async () => {
    /*
     * Bản đầu của bài này render một component tự gọi `useApplyStreak()`. Nó
     * chứng minh CƠ CHẾ chạy đúng, nhưng không khoá được ĐƯỜNG DÂY: xoá
     * `onSuccess: ({ streak }) => applyStreak(streak)` khỏi `useSaveTopicWord`
     * thì 245 test vẫn xanh, và chip đứng im suốt phiên học chủ đề — đúng thứ
     * plan gọi là rủi ro hồi quy số một.
     *
     * Đây là hook THẬT, và `saveWord` bị mock ở tầng API để trả đúng hình dạng
     * server trả.
     */
    fetchStreak.mockResolvedValue(snapshot)
    saveWord.mockResolvedValue({
      word: { id: 1 },
      streak: { current: 13, met_today: true, advanced: true },
    })

    function Harness() {
      const save = useSaveTopicWord()

      return (
        <>
          <StreakChip />
          <button onClick={() => save.mutate(1)}>Thêm vào kho</button>
        </>
      )
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <Harness />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await screen.findByRole('link', { name: 'Chuỗi 12 ngày, hôm nay chưa đạt mục tiêu' })

    const callsBefore = fetchStreak.mock.calls.length

    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào kho' }))

    await screen.findByRole('link', { name: 'Chuỗi 13 ngày, hôm nay đã đạt mục tiêu' })
    expect(fetchStreak.mock.calls.length).toBe(callsBefore)
  })

  it('cache rỗng thì gọi lại /streak thay vì nuốt cập nhật', async () => {
    // `/streak` hỏng lúc mở app → chip lấy số từ `/auth/me`. Lưu từ xong mà bỏ
    // qua delta thì chip đứng ở số cũ tới hết phiên: `staleTime` 60 giây,
    // `refetchOnWindowFocus` tắt, và chip không bao giờ unmount.
    fetchStreak.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({
      ...snapshot,
      current: 13,
      met_today: true,
    })
    me.mockResolvedValue({
      user: { id: 1, name: 'a', email: 'a@b.c', created_at: null },
      streak: { current: 12, met_today: false },
    })
    saveWord.mockResolvedValue({
      word: { id: 1 },
      streak: { current: 13, met_today: true, advanced: true },
    })

    function Harness() {
      const save = useSaveTopicWord()

      return (
        <>
          <StreakChip />
          <button onClick={() => save.mutate(1)}>Thêm vào kho</button>
        </>
      )
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <Harness />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await screen.findByRole('link', { name: 'Chuỗi 12 ngày, hôm nay chưa đạt mục tiêu' })

    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào kho' }))

    await screen.findByRole('link', { name: 'Chuỗi 13 ngày, hôm nay đã đạt mục tiêu' })
  })
})

describe('parseStreakDelta — biên tin cậy dữ liệu server', () => {
  it('nhận đúng hình dạng hợp lệ', () => {
    expect(parseStreakDelta({ current: 3, met_today: true, advanced: false })).toEqual({
      current: 3,
      met_today: true,
      advanced: false,
    })
  })

  it('trả undefined cho mọi thứ không đúng hình dạng', () => {
    // `null` là ca THẬT, không phải phòng xa: đường `finish` idempotent từng trả
    // đúng giá trị đó, và một `as StreakDelta` trần đã để nó lọt xuống cache của
    // chip — chip tụt về 0 ngay giữa phiên.
    for (const bad of [
      null,
      undefined,
      'x',
      42,
      {},
      { current: 3 },
      { current: '3', met_today: true, advanced: true },
    ]) {
      expect(parseStreakDelta(bad)).toBeUndefined()
    }
  })
})

describe('StreakCalendar', () => {
  it('mỗi ô nói rõ ngày và trạng thái cho screen reader', () => {
    render(
      <StreakCalendar
        days={[
          { date: '2026-08-30', met: true },
          { date: '2026-08-31', met: false },
        ]}
      />,
    )

    // Màu KHÔNG được là thông tin duy nhất; `role="img"` là thứ khiến nhãn
    // được đọc — `aria-label` trên `<span>` role generic bị NVDA/JAWS bỏ qua.
    expect(screen.getByRole('img', { name: '30/8: đã đạt' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '31/8: chưa đạt' })).toBeInTheDocument()
  })
})
