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
  it('NĂM tab trên mobile, SÁU mục trên desktop, thứ tự cố định', async () => {
    /*
     * Trong suốt vạch ship MVP đây là 4 tab; Thống kê thêm ở P17; Chủ đề thêm
     * khi màn học theo chủ đề lên. Test này từng khóa con số 4 rồi 5, và mỗi
     * lần đỏ đều đúng lúc thanh điều hướng thật sự đổi — đó là hành vi mong
     * muốn của nó, không phải phiền toái.
     *
     * "Tài khoản" nằm CUỐI và chỉ hiện trên desktop: thanh dưới nhường chỗ cho
     * Chủ đề (việc hàng ngày), còn Tài khoản lùi lên icon ở header. Vị trí cuối
     * là ràng buộc thật, không phải thẩm mỹ — pill nền dựa vào việc chỉ số của
     * năm mục đầu giống nhau ở cả hai bố cục.
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
      'Tài khoản',
    ])

    // Đúng MỘT mục chỉ-có-trên-desktop, và nó phải là mục cuối.
    const desktopOnly = links.filter((link) => link.closest('li')?.className.includes('hidden'))

    expect(desktopOnly).toHaveLength(1)
    expect(desktopOnly[0]?.textContent).toBe('Tài khoản')
  })

  it('mobile có lối vào Tài khoản ở header vì thanh dưới không còn tab đó', async () => {
    // Bỏ tab mà không thay lối vào là khoá người dùng mobile khỏi màn Tài
    // khoản — nơi có đăng xuất và mọi cài đặt.
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
    // Ẩn trên desktop: sidebar đã có mục Tài khoản đầy đủ.
    expect(outsideNav[0]?.className).toContain('lg:hidden')
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
