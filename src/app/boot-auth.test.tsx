import { render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import { Providers } from './providers'
import { routes } from './router'

/**
 * Dựng ĐÚNG cây của `main.tsx` — có `Providers`, có `StrictMode`.
 *
 * `router.test.tsx` gắn `QueryClientProvider` bằng tay và bỏ qua `Providers`,
 * nên nó không bao giờ chạy qua đoạn nối token vào tầng HTTP. Chính khoảng
 * trống đó giấu bug F5.
 */
function renderApp(initialEntry: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] })

  render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  )

  return router
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  useAuthStore.setState({ token: 'test-token' })

  // jsdom không dựng `matchMedia`; `Providers` áp tùy chỉnh hiển thị cần nó.
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )

  // `lib/api.ts` luôn gọi fetch với URL dạng chuỗi — khai kiểu hẹp theo đúng
  // hợp đồng đó thay vì `RequestInfo`.
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const auth = new Headers(init?.headers).get('Authorization')

    // Server thật: không có Bearer thì 401, bất kể endpoint nào.
    if (auth === null) {
      return Promise.resolve(
        new Response(JSON.stringify({ message: 'Unauthenticated.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }

    const data = url.includes('/vocabulary/ids')
      ? []
      : { user: { id: 1, name: 'Quốc', email: 'q@h.test' } }

    return Promise.resolve(
      new Response(JSON.stringify({ data }), { headers: { 'Content-Type': 'application/json' } }),
    )
  })

  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  useAuthStore.setState({ token: null })
})

describe('tải lại trang khi đã đăng nhập', () => {
  it('gắn Bearer vào request đầu tiên, không để nó bay đi trần', async () => {
    renderApp('/search')

    await screen.findByRole('heading', { name: 'Tìm kiếm' })
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())

    const missing = fetchMock.mock.calls.filter(
      ([, init]) =>
        new Headers((init as RequestInit | undefined)?.headers).get('Authorization') === null,
    )

    expect(missing).toEqual([])
  })

  it('KHÔNG đá về /login sau khi F5', async () => {
    const router = renderApp('/search')

    await screen.findByRole('heading', { name: 'Tìm kiếm' })
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    // Đợi 401 kịp quay về và xóa phiên nếu bug còn.
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/search'))

    expect(useAuthStore.getState().token).toBe('test-token')
    expect(router.state.location.pathname).toBe('/search')
  })
})
