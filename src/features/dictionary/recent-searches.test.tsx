import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTokenReader } from '@/lib/api'
import { useRecentSearches } from '@/stores/recent-searches'
import { SearchPage } from './pages/SearchPage'

/*
 * Chip lịch sử tìm kiếm từng là `<span>` không có handler: mang nền pill và bo
 * tròn nên trông bấm được, mà chạm vào thì không có gì xảy ra.
 *
 * Test này khoá lại đúng chỗ đó. Nó khẳng định chip là một CONTROL thật chứ
 * không phải chữ có nền — một `<span>` trang trí quay lại thì `getByRole` không
 * tìm thấy và bài test đổ, thay vì lặng lẽ ship một nút chết lần nữa.
 */

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({ data: [], meta: { page: 1, per_page: 20, total: 0, hint: null } }),
      { headers: { 'Content-Type': 'application/json' } },
    ),
  )
  useRecentSearches.setState({ items: ['học tập'] })
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  setTokenReader(null)
  useRecentSearches.setState({ items: [] })
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('lịch sử tìm kiếm', () => {
  it('chip là nút bấm được, không phải chữ trang trí', () => {
    renderPage()

    expect(screen.getByRole('button', { name: 'học tập' })).toBeInTheDocument()
  })

  it('bấm chip thì điền lại từ khoá vào ô tìm kiếm', async () => {
    const user = userEvent.setup()

    renderPage()
    await user.click(screen.getByRole('button', { name: 'học tập' }))

    /*
     * Khẳng định trên Ô TÌM KIẾM, không phải trên request.
     *
     * Điền lại ô là phần người dùng nhìn thấy và là lý do đi qua `setInput` thay
     * vì gọi thẳng API: tra lại mà ô vẫn rỗng thì kết quả đổi mà không nói được
     * đang tra gì. Request tự tới sau khi hết 400ms hoãn.
     */
    expect(screen.getByRole('searchbox')).toHaveValue('học tập')
  })
})
