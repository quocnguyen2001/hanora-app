import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth'
import { routes } from './router'

function renderApp(initialEntry = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] })

  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return router
}

/** Có token = đã đăng nhập. `ProtectedRoute` gate trên đúng thứ này. */
function signIn() {
  useAuthStore.setState({ token: 'test-token' })
}

beforeEach(() => {
  useAuthStore.setState({ token: null })
  // Màn có gọi API (`useMe`) — chặn mạng thật để test không phụ thuộc server.
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ data: { user: { id: 1, name: 'Quốc', email: 'q@h.test' } } }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cổng xác thực — D8', () => {
  it('đá về /login khi chưa có token', async () => {
    const router = renderApp('/search')

    expect(await screen.findByRole('heading', { name: 'Chào mừng trở lại' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('bảo vệ CẢ màn tìm kiếm — không có chế độ khách', async () => {
    const router = renderApp('/search')

    await screen.findByRole('heading', { name: 'Chào mừng trở lại' })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('nhớ chỗ định tới để quay lại sau khi đăng nhập', async () => {
    const router = renderApp('/vocabulary')

    await screen.findByRole('heading', { name: 'Chào mừng trở lại' })

    expect((router.state.location.state as { redirect?: string }).redirect).toBe('/vocabulary')
  })

  it('cho vào khi đã có token', async () => {
    signIn()
    const router = renderApp('/search')

    expect(await screen.findByRole('heading', { name: 'Tìm kiếm' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/search')
  })

  it('KHÔNG chặn các màn auth, tránh vòng lặp chuyển hướng', async () => {
    renderApp('/register')

    expect(await screen.findByRole('heading', { name: 'Bắt đầu với hanora' })).toBeInTheDocument()
  })
})

describe('router', () => {
  it('chuyển hướng / sang /search khi đã đăng nhập', async () => {
    signIn()
    const router = renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Tìm kiếm' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/search')
  })

  it.each([
    ['/search', 'Tìm kiếm'],
    ['/vocabulary', 'Kho từ'],
    ['/review', 'Ôn tập'],
    ['/stats', 'Thống kê'],
    ['/account', 'Tài khoản'],
  ])('render %s', async (path, heading) => {
    signIn()
    renderApp(path)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('điều hướng được bằng bottom navigation', async () => {
    signIn()
    const user = userEvent.setup()
    const router = renderApp('/search')
    const nav = await screen.findByRole('navigation', { name: 'Điều hướng chính' })

    await user.click(within(nav).getByRole('link', { name: /Kho từ/ }))

    expect(router.state.location.pathname).toBe('/vocabulary')
  })
})

describe('bottom navigation', () => {
  it('ship 5 tab kể từ P17, thứ tự cố định', async () => {
    /*
     * Trong suốt vạch ship MVP đây là 4 tab: tab Thống kê chỉ được thêm khi
     * P16/P17 xong và màn đó có nội dung thật. Test này từng khóa con số 4 và
     * đã đỏ đúng lúc P17 thêm tab — đó là hành vi mong muốn của nó.
     */
    signIn()
    renderApp('/search')

    const nav = await screen.findByRole('navigation', { name: 'Điều hướng chính' })
    // Giới hạn trong nav: link do page render ra không được tính vào.
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)

    expect(labels).toEqual(['Tìm kiếm(đang xem)', 'Kho từ', 'Ôn tập', 'Thống kê', 'Tài khoản'])
  })

  it('chỉ có MỘT landmark điều hướng, không phải hai', async () => {
    // Hai `<nav>` trùng tên (bản mobile + bản desktop cùng nằm trong DOM) khiến
    // screen reader thấy hai vùng điều hướng và không biết cái nào đang thật.
    signIn()
    renderApp('/search')

    await screen.findByRole('navigation', { name: 'Điều hướng chính' })

    expect(screen.getAllByRole('navigation', { name: 'Điều hướng chính' })).toHaveLength(1)
  })
})
