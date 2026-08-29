import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createQueryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth'
import { routes } from '@/app/router'

/**
 * Audit a11y tự động (P20 bước 13).
 *
 * Không thay được rà soát bằng tay, nhưng bắt được đúng nhóm lỗi hay lọt và dễ
 * hồi quy: nút không có tên gọi, contrast không đạt, thiếu vai trò ARIA.
 */
beforeEach(() => {
  useAuthStore.setState({ token: 'test-token' })
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ data: [], meta: { page: 1, per_page: 20, total: 0, hint: null } }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    ),
  )
})

async function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const { container } = render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  // Chờ route lười tải xong.
  await new Promise((resolve) => setTimeout(resolve, 60))

  return container
}

describe('a11y', () => {
  it.each(['/search', '/vocabulary', '/review', '/review/history', '/stats', '/account'])(
    'không có vi phạm axe ở %s',
    async (path) => {
      const container = await renderRoute(path)
      const results = await axe(container)

      expect(results.violations).toEqual([])
    },
  )

  it('không có vi phạm ở màn đăng nhập', async () => {
    useAuthStore.setState({ token: null })
    const container = await renderRoute('/login')

    expect((await axe(container)).violations).toEqual([])
  })
})
