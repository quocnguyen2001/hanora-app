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
    ['/topics', 'Học theo chủ đề'],
  ])('render %s', async (path, heading) => {
    signIn()
    renderApp(path)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('điều hướng được bằng menu chính', async () => {
    signIn()
    const user = userEvent.setup()
    const router = renderApp('/search')
    const nav = await screen.findByRole('navigation', { name: 'Điều hướng chính' })

    await user.click(within(nav).getByRole('link', { name: /Kho từ/ }))

    expect(router.state.location.pathname).toBe('/vocabulary')
  })
})

describe('điều hướng chính', () => {
  it('NĂM mục, cùng một danh sách ở mọi cỡ màn, thứ tự cố định', async () => {
    /*
     * Trong suốt vạch ship MVP đây là 4 tab; Thống kê thêm ở P17; Chủ đề thêm
     * khi màn học theo chủ đề lên. Test này từng khóa con số 4 rồi 5, và mỗi
     * lần đỏ đều đúng lúc thanh điều hướng thật sự đổi — đó là hành vi mong
     * muốn của nó, không phải phiền toái.
     *
     * Từng có mục thứ SÁU ("Tài khoản") chỉ hiện trên desktop, vì sidebar dọc
     * có chỗ còn thanh dưới thì không. Bỏ sidebar là bỏ luôn lý do đó: menu
     * ngang chịu cùng ràng buộc bề ngang như thanh dưới, nên hai bố cục mang
     * ĐÚNG một danh sách và không còn mục nào ẩn theo cỡ màn.
     */
    signIn()
    renderApp('/search')

    const nav = await screen.findByRole('navigation', { name: 'Điều hướng chính' })
    const links = within(nav).getAllByRole('link')

    expect(links.map((link) => link.textContent)).toEqual([
      'Tìm kiếm(đang xem)',
      'Kho từ',
      'Ôn tập',
      'Chủ đề',
      'Thống kê',
    ])

    // Không mục nào bị ẩn theo cỡ màn — đó là cả điểm của việc gộp hai danh sách.
    expect(links.filter((link) => link.closest('li')?.className.includes('hidden'))).toHaveLength(0)
  })

  it('Tài khoản có lối vào ở header ở MỌI cỡ màn', async () => {
    // Nó rời khỏi menu chính, nên nếu lối vào ở header cũng mất thì người dùng
    // bị khoá khỏi màn có đăng xuất và mọi cài đặt.
    signIn()
    renderApp('/search')

    await screen.findByRole('navigation', { name: 'Điều hướng chính' })

    // Nhiều `<header>` cùng có role `banner` (mỗi trang có header riêng), nên
    // lọc theo thứ phân biệt thật: link Tài khoản nằm NGOÀI thanh điều hướng.
    const outsideNav = screen
      .getAllByRole('link', { name: 'Tài khoản' })
      .filter((link) => link.closest('nav') === null)

    expect(outsideNav).toHaveLength(1)
    expect(outsideNav[0]).toHaveAttribute('href', '/account')
    // KHÔNG còn `lg:hidden`: sidebar từng có mục Tài khoản riêng, giờ thì không.
    expect(outsideNav[0]?.className).not.toContain('lg:hidden')
  })

  it('chỉ có MỘT landmark điều hướng, không phải hai', async () => {
    /*
     * Hai `<nav>` trùng tên khiến screen reader thấy hai vùng điều hướng và
     * không biết cái nào đang thật.
     *
     * Ràng buộc này SIẾT LẠI sau khi bỏ sidebar, không nới ra. Menu giờ nằm
     * trong `<header>` và phải phục vụ cả hai bố cục từ một chỗ, nên cám dỗ
     * "render thêm một bản cho mobile" lớn hơn hẳn lúc nó là component riêng.
     */
    signIn()
    renderApp('/search')

    await screen.findByRole('navigation', { name: 'Điều hướng chính' })

    expect(screen.getAllByRole('navigation', { name: 'Điều hướng chính' })).toHaveLength(1)
  })
})
