import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTokenReader } from '@/lib/api'
import { useRecentSearches } from '@/stores/recent-searches'
import { useSearchMode } from '@/stores/search-mode'
import { dictionaryKeys } from './hooks'
import { SearchPage } from './pages/SearchPage'

/*
 * Nút "Kết quả chưa đúng? Tìm lại bằng AI".
 *
 * Bất biến khó nhất KHÔNG phải là nút hiện ra — mà là nó BIẾN MẤT. `meta.source`
 * một mình không đủ để biết đã hỏi AI hay chưa: khi AI trả rỗng, API vẫn báo
 * `source: 'sql'` và cache câu trả lời rỗng đó vĩnh viễn. Điều kiện hiện nút chỉ
 * đọc `source` sẽ cho ra một cái nút bấm mãi không đổi gì.
 */

const fetchMock = vi.fn<typeof fetch>()

const WORD = {
  id: 1,
  simplified: '博士',
  traditional: '博士',
  pinyin: 'bó shì',
  han_viet: 'bác sĩ',
  definitions_en: ['doctor (PhD)'],
  definitions_vi: ['tiến sĩ'],
  hsk_level: 5,
}

/** Payload, KHÔNG phải `Response`: body của một `Response` chỉ đọc được MỘT lần. */
function searchBody(words: unknown[], source: 'sql' | 'ai') {
  return {
    data: words,
    meta: { page: 1, per_page: 20, total: words.length, hint: null, source },
  }
}

function json(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Lần lượt trả từng payload cho `/dictionary/search`, giữ nguyên payload cuối cho
 * mọi lượt sau. Mọi URL khác (kho từ đã lưu) trả mảng rỗng.
 */
function respondWith(...searches: ReturnType<typeof searchBody>[]) {
  let call = 0

  fetchMock.mockImplementation((input) => {
    const url = typeof input === 'string' ? input : (input as URL).toString()

    if (!url.includes('/dictionary/search')) return Promise.resolve(json({ data: [] }))

    const payload = searches[Math.min(call, searches.length - 1)]
    call += 1

    return Promise.resolve(json(payload))
  })
}

function searchUrls(): string[] {
  return fetchMock.mock.calls
    .map(([input]) => (typeof input === 'string' ? input : (input as URL).toString()))
    .filter((url) => url.includes('/dictionary/search'))
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  useRecentSearches.setState({ items: [] })
  useSearchMode.setState({ mode: null })
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  setTokenReader(null)
  useRecentSearches.setState({ items: [] })
  useSearchMode.setState({ mode: null })
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

const BUTTON = { name: /Tìm lại bằng AI/ }

/** Gõ truy vấn rồi chờ qua 400ms hoãn cho tới khi có kết quả. */
async function search(user: ReturnType<typeof userEvent.setup>, term = 'bác sĩ') {
  await user.type(screen.getByRole('searchbox'), term)
  await waitFor(() => expect(searchUrls().length).toBeGreaterThan(0))
}

describe('nút hiện đúng lúc nó làm được việc', () => {
  it('hiện khi kết quả đến từ SQL', async () => {
    respondWith(searchBody([WORD], 'sql'))
    const user = userEvent.setup()

    renderPage()
    await search(user)

    expect(await screen.findByRole('button', BUTTON)).toBeInTheDocument()
  })

  it('KHÔNG hiện khi AI đã trả lời', async () => {
    // Cache diễn giải phía API là vĩnh viễn theo `(truy vấn, mode)` — bấm lại
    // chỉ nhận đúng câu trả lời vừa hiện. Đó là một nút chết.
    respondWith(searchBody([WORD], 'ai'))
    const user = userEvent.setup()

    renderPage()
    await search(user)

    await waitFor(() => expect(screen.getByText('博士')).toBeInTheDocument())
    expect(screen.queryByRole('button', BUTTON)).not.toBeInTheDocument()
  })

  it('KHÔNG hiện khi không có kết quả nào', async () => {
    // `total === 0` đã được `SearchWeakness` coi là yếu, nên AI đã tự chạy rồi.
    respondWith(searchBody([], 'sql'))
    const user = userEvent.setup()

    renderPage()
    await search(user)

    await waitFor(() => expect(screen.getByText('Không tìm thấy từ nào.')).toBeInTheDocument())
    expect(screen.queryByRole('button', BUTTON)).not.toBeInTheDocument()
  })
})

describe('bấm nút', () => {
  it('gửi refine=ai ở request thứ hai', async () => {
    respondWith(searchBody([WORD], 'sql'), searchBody([WORD], 'ai'))
    const user = userEvent.setup()

    renderPage()
    await search(user)
    await user.click(await screen.findByRole('button', BUTTON))

    await waitFor(() => expect(searchUrls().length).toBeGreaterThan(1))

    // Lượt đầu KHÔNG được mang refine — đó là đường tra bình thường.
    expect(searchUrls()[0]).not.toContain('refine')
    expect(searchUrls().at(-1)).toContain('refine=ai')
  })

  it('nút biến mất khi AI trả lời được', async () => {
    respondWith(searchBody([WORD], 'sql'), searchBody([WORD], 'ai'))
    const user = userEvent.setup()

    renderPage()
    await search(user)
    await user.click(await screen.findByRole('button', BUTTON))

    await waitFor(() => expect(screen.queryByRole('button', BUTTON)).not.toBeInTheDocument())
  })

  it('nút biến mất và nói thật khi AI không cải thiện được gì', async () => {
    /*
     * AI trả rỗng → API vẫn báo `source: 'sql'`. Không nhớ "đã refine" thì nút
     * vẫn còn và bấm lại ra đúng cái cũ, mãi mãi.
     */
    respondWith(searchBody([WORD], 'sql'), searchBody([WORD], 'sql'))
    const user = userEvent.setup()

    renderPage()
    await search(user)
    await user.click(await screen.findByRole('button', BUTTON))

    expect(
      await screen.findByText('Đã thử tìm lại bằng AI, chưa có kết quả tốt hơn.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', BUTTON)).not.toBeInTheDocument()
  })

  it('KHÔNG nói "chưa có kết quả tốt hơn" trong lúc còn đang hỏi', async () => {
    /*
     * Câu đó là một KẾT LUẬN. Hiện nó trong lúc lượt gọi còn đang bay là nói về
     * một câu trả lời chưa tới — và vì `placeholderData` giữ danh sách SQL cũ
     * trên màn hình, đó đúng là khoảnh khắc dễ nhầm nhất.
     */
    const user = userEvent.setup()
    let release: (() => void) | undefined

    fetchMock.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as URL).toString()

      if (!url.includes('/dictionary/search')) return Promise.resolve(json({ data: [] }))

      if (!url.includes('refine=ai')) return Promise.resolve(json(searchBody([WORD], 'sql')))

      // Lượt refine treo cho tới khi test cho phép trả lời.
      return new Promise<Response>((resolve) => {
        release = () => resolve(json(searchBody([WORD], 'sql')))
      })
    })

    renderPage()
    await search(user)
    await user.click(await screen.findByRole('button', BUTTON))

    await waitFor(() => expect(searchUrls().some((u) => u.includes('refine=ai'))).toBe(true))

    expect(
      screen.queryByText('Đã thử tìm lại bằng AI, chưa có kết quả tốt hơn.'),
    ).not.toBeInTheDocument()

    release?.()

    // Trả lời tới rồi thì mới được kết luận.
    expect(
      await screen.findByText('Đã thử tìm lại bằng AI, chưa có kết quả tốt hơn.'),
    ).toBeInTheDocument()
  })

  it('nút hiện lại cho truy vấn khác', async () => {
    // Trạng thái khoá theo cặp `(mode, query)`, không được dính sang truy vấn mới.
    respondWith(searchBody([WORD], 'sql'))
    const user = userEvent.setup()

    renderPage()
    await search(user)
    await user.click(await screen.findByRole('button', BUTTON))

    await screen.findByText('Đã thử tìm lại bằng AI, chưa có kết quả tốt hơn.')

    await user.type(screen.getByRole('searchbox'), ' khác')

    expect(await screen.findByRole('button', BUTTON)).toBeInTheDocument()
  })
})

describe('kết quả refine phải tới được lần tra sau', () => {
  it('chép sang khoá KHÔNG refine', async () => {
    /*
     * Thiếu bước chép này, gõ lại đúng truy vấn đó sẽ hiện lại danh sách SQL cũ:
     * khoá không-refine vẫn giữ bản cũ và `staleTime` một tiếng nghĩa là nó
     * không hỏi lại server. Nút trông như không có tác dụng.
     */
    respondWith(searchBody([WORD], 'sql'), searchBody([WORD], 'ai'))
    const user = userEvent.setup()

    const { client } = renderPage()
    await search(user)
    await user.click(await screen.findByRole('button', BUTTON))

    await waitFor(() => expect(screen.queryByRole('button', BUTTON)).not.toBeInTheDocument())

    const mirrored = client.getQueryData<{ meta: { source: string } }>(
      dictionaryKeys.search('bác sĩ', null, false),
    )

    expect(mirrored?.meta.source).toBe('ai')
  })
})

describe('query key', () => {
  it('đổi theo refine để bấm nút là refetch, không phải trả cache cũ', () => {
    expect(dictionaryKeys.search('bác sĩ', null, true)).not.toEqual(
      dictionaryKeys.search('bác sĩ', null, false),
    )
  })
})
