import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTokenReader } from '@/lib/api'
import type { WordDetail } from '@/types/dictionary'
import { WordDetailPage } from './pages/WordDetailPage'

const fetchMock = vi.fn<typeof fetch>()

const word: WordDetail = {
  id: 7,
  simplified: '学习',
  traditional: '學習',
  pinyin: 'xuéxí',
  han_viet: 'học tập',
  definitions_en: ['to learn', 'to study'],
  definitions_vi: ['học tập'],
  measure_words: [],
  hsk_level: 1,
  characters: [],
  examples: [
    {
      id: 11,
      sentence_zh: '学校8点半开始上课。',
      translation_en: 'School begins at eight-thirty.',
      contributor: 'fucongcong',
      license: 'CC BY 2.0 FR',
    },
    {
      id: 12,
      sentence_zh: '我妹妹每周上两次钢琴课。',
      translation_en: 'My sister takes piano lessons twice a week.',
      contributor: 'fucongcong',
      license: 'CC BY 2.0 FR',
    },
  ],
}

/** `fetch` nhận string, `URL`, hoặc `Request` — mỗi loại giữ URL ở một chỗ khác. */
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href

  return input.url
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Định tuyến theo URL: trang chi tiết gọi song song nhiều endpoint, nên một
 * `mockResolvedValue` duy nhất sẽ trả cùng một payload cho tất cả.
 */
function route(handlers: { detail?: WordDetail; translations?: () => Response }): void {
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)

    if (url.includes('/example-translations')) {
      return Promise.resolve(
        handlers.translations?.() ?? json({ data: [], meta: { status: 'unavailable' } }),
      )
    }

    if (url.includes('/vocabulary/ids')) {
      return Promise.resolve(json({ data: [] }))
    }

    return Promise.resolve(json({ data: handlers.detail ?? word }))
  })
}

function Harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/words/${word.id}`]}>
        <Routes>
          <Route path="/words/:id" element={<WordDetailPage />} />
        </Routes>
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

describe('nghĩa tiếng Việt của câu ví dụ', () => {
  it('hiện dòng Việt mà KHÔNG bỏ dòng Anh và dòng ghi công', async () => {
    // Bản Việt do máy dịch, không có người rà — dòng tiếng Anh là cơ chế đối
    // chiếu duy nhất người học có, và ghi công Tatoeba là nghĩa vụ CC BY.
    route({
      translations: () =>
        json({
          data: [
            { id: 11, translation_vi: 'Trường học bắt đầu lớp lúc 8 rưỡi.' },
            { id: 12, translation_vi: 'Em gái tôi học piano hai buổi mỗi tuần.' },
          ],
          meta: { status: 'ready' },
        }),
    })

    render(<Harness />)

    expect(await screen.findByText('Trường học bắt đầu lớp lúc 8 rưỡi.')).toBeInTheDocument()
    expect(screen.getByText('School begins at eight-thirty.')).toBeInTheDocument()
    expect(screen.getAllByText(/Tatoeba · fucongcong/)).toHaveLength(2)
  })

  it('gắn nhãn nguồn AI đúng MỘT lần cho cả khối', async () => {
    route({
      translations: () =>
        json({
          data: [
            { id: 11, translation_vi: 'Trường học bắt đầu lớp lúc 8 rưỡi.' },
            { id: 12, translation_vi: 'Em gái tôi học piano hai buổi mỗi tuần.' },
          ],
          meta: { status: 'ready' },
        }),
    })

    render(<Harness />)

    await screen.findByText('Trường học bắt đầu lớp lúc 8 rưỡi.')
    expect(screen.getAllByText(/do AI dịch/i)).toHaveLength(1)
  })

  it('ghép bản dịch theo id, không theo thứ tự mảng', async () => {
    // API không hứa thứ tự nào; ghép theo chỉ số là chờ ngày nó đổi.
    route({
      translations: () =>
        json({
          data: [
            { id: 12, translation_vi: 'Em gái tôi học piano hai buổi mỗi tuần.' },
            { id: 11, translation_vi: 'Trường học bắt đầu lớp lúc 8 rưỡi.' },
          ],
          meta: { status: 'ready' },
        }),
    })

    render(<Harness />)

    const first = await screen.findByText('学校8点半开始上课。')
    const row = first.closest('li')

    expect(row).not.toBeNull()
    expect(row).toHaveTextContent('Trường học bắt đầu lớp lúc 8 rưỡi.')
    expect(row).not.toHaveTextContent('Em gái tôi học piano')
  })

  it('hiện khung chờ trong lúc API còn đang dịch', async () => {
    route({ translations: () => json({ data: [], meta: { status: 'pending' } }, 202) })

    render(<Harness />)

    const sentence = await screen.findByText('学校8点半开始上课。')
    const list = sentence.closest('ul')

    // `Skeleton` tự `aria-hidden`, nên trạng thái tải phải nằm ở vùng bọc.
    await waitFor(() => {
      expect(list).toHaveAttribute('aria-busy', 'true')
    })

    expect(list?.querySelector('.animate-skeleton')).not.toBeNull()
  })

  it('giữ khối ví dụ nguyên vẹn khi lớp dịch không dùng được', async () => {
    // `unavailable` KHÔNG phải lỗi: khối trông đúng như trước khi có tính năng.
    route({ translations: () => json({ data: [], meta: { status: 'unavailable' } }) })

    render(<Harness />)

    expect(await screen.findByText('School begins at eight-thirty.')).toBeInTheDocument()
    expect(screen.queryByText(/do AI dịch/i)).not.toBeInTheDocument()
  })

  it('giữ phần đã dịch được khi một câu không dịch được', async () => {
    route({
      translations: () =>
        json({
          data: [{ id: 11, translation_vi: 'Trường học bắt đầu lớp lúc 8 rưỡi.' }],
          meta: { status: 'unavailable' },
        }),
    })

    render(<Harness />)

    expect(await screen.findByText('Trường học bắt đầu lớp lúc 8 rưỡi.')).toBeInTheDocument()
    expect(screen.getByText('My sister takes piano lessons twice a week.')).toBeInTheDocument()
  })

  it('KHÔNG gọi endpoint dịch cho từ không có câu ví dụ', async () => {
    // ~15% từ trong tập ưu tiên không có câu nào — gọi cho chúng là một request
    // chắc chắn trả về mảng rỗng.
    route({ detail: { ...word, examples: [] } })

    render(<Harness />)

    await screen.findByText('学习')
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    const called = fetchMock.mock.calls.map(([input]) => urlOf(input))

    expect(called.some((url) => url.includes('/example-translations'))).toBe(false)
  })
})
