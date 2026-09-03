import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { axe } from 'vitest-axe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WordDetail } from '@/types/dictionary'
import { WordDetailPage } from './pages/WordDetailPage'

const word: WordDetail = {
  id: 7,
  simplified: '学习',
  traditional: '學習',
  pinyin: 'xuéxí',
  han_viet: 'học tập',
  definitions_en: ['to learn'],
  definitions_vi: ['học tập'],
  measure_words: [],
  hsk_level: 1,
  characters: [{ char: '学', pinyin: 'xué', han_viet: 'học', ...emptyAttributes() }],
  examples: [],
}

function emptyAttributes() {
  return {
    radical: null,
    radical_han_viet: null,
    stroke_count: null,
    decomposition: null,
    etymology_type: null,
    stroke_names: null,
  }
}

const fetchMock = vi.fn<typeof fetch>()

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Từ nghèo nhất có thể: không câu ví dụ, không bản làm giàu, không Hán tự. */
const bareWord: WordDetail = { ...word, characters: [], examples: [] }

/** Router THẬT chứ không `MemoryRouter`: test dưới đây đọc lịch sử điều hướng. */
function renderPage(initial = '/words/7') {
  const router = createMemoryRouter([{ path: '/words/:id', Component: WordDetailPage }], {
    initialEntries: ['/search', initial],
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const { container } = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { router, container }
}

beforeEach(() => {
  fetchMock.mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    if (url.includes('/vocabulary/ids')) return Promise.resolve(json({ data: [] }))

    if (url.includes('/enrichment') || url.includes('/illustration')) {
      return Promise.resolve(json({ data: null, meta: { status: 'unavailable' } }))
    }

    return Promise.resolve(json({ data: word }))
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('tab của màn chi tiết từ nằm trong URL', () => {
  it('mở đúng tab khi vào thẳng bằng `?tab=`', async () => {
    /*
     * Hợp đồng deep link. Tab "Ví dụ" chứa danh sách từ ghép bấm được, mỗi mục
     * dẫn sang một trang chi tiết khác — không có tab trong URL thì không có
     * cách nào quay lại đúng chỗ.
     */
    renderPage('/words/7?tab=hantu')

    expect(await screen.findByRole('tab', { name: 'Hán tự', selected: true })).toBeInTheDocument()
  })

  it('rơi về tab đầu khi `?tab=` là giá trị lạ', async () => {
    // Giá trị này đến từ URL người dùng gõ hoặc link cũ — không được làm trắng
    // panel, cũng không được để `TabView` không có tab nào đang chọn.
    renderPage('/words/7?tab=khong-ton-tai')

    expect(await screen.findByRole('tab', { name: 'Nghĩa', selected: true })).toBeInTheDocument()
  })

  it('bấm tab ghi vào URL', async () => {
    const user = userEvent.setup()
    const { router } = renderPage()

    await user.click(await screen.findByRole('tab', { name: 'Hán tự' }))

    expect(router.state.location.search).toBe('?tab=hantu')
  })

  it('đổi tab KHÔNG đẩy thêm bản ghi lịch sử', async () => {
    /*
     * `replace: true`, và đây là lý do.
     *
     * Nếu mỗi lần đổi tab đẩy một bản ghi, người dùng xem cả ba tab rồi bấm
     * Back sẽ phải bấm ba lần mới rời được trang — nút Back của trình duyệt
     * biến thành nút "tab trước". Sau hai lần đổi tab, MỘT lần lùi vẫn phải đưa
     * họ về màn trước đó.
     */
    const user = userEvent.setup()
    const { router } = renderPage()

    await user.click(await screen.findByRole('tab', { name: 'Hán tự' }))
    await user.click(screen.getByRole('tab', { name: 'Ví dụ' }))

    await router.navigate(-1)

    expect(router.state.location.pathname).toBe('/search')
  })
})

describe('bộ tab cố định', () => {
  /*
   * Tiêu chí SỐ MỘT của cả thiết kế, và trước bài này không có gì khoá nó.
   *
   * Cả điểm của việc chia tab là bộ tab giống hệt nhau ở MỌI từ: học một lần
   * rồi biết cái gì nằm ở đâu. Một tab tự ẩn khi thiếu dữ liệu sẽ tái tạo đúng
   * cái tật đang sửa — "cấu trúc đổi theo từng từ" — ở dạng tệ hơn, vì nội dung
   * AI về muộn sẽ làm tab MỌC THÊM sau khi trang đã tải xong.
   */
  it('vẫn đủ BA tab với từ không có ví dụ, không Hán tự, không bản làm giàu', async () => {
    fetchMock.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

      if (url.includes('/vocabulary/ids')) return Promise.resolve(json({ data: [] }))

      if (url.includes('/enrichment') || url.includes('/illustration')) {
        return Promise.resolve(json({ data: null, meta: { status: 'unavailable' } }))
      }

      return Promise.resolve(json({ data: bareWord }))
    })

    renderPage()

    expect(await screen.findByRole('tab', { name: 'Nghĩa' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Nghĩa',
      'Hán tự',
      'Ví dụ',
    ])
  })

  it('hai tab rỗng NÓI RA vì sao trống thay vì biến mất', async () => {
    fetchMock.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

      if (url.includes('/vocabulary/ids')) return Promise.resolve(json({ data: [] }))

      if (url.includes('/enrichment') || url.includes('/illustration')) {
        return Promise.resolve(json({ data: null, meta: { status: 'unavailable' } }))
      }

      return Promise.resolve(json({ data: bareWord }))
    })

    renderPage('/words/7?tab=vidu')
    expect(await screen.findByText('Chưa có ví dụ cho từ này')).toBeInTheDocument()
  })

  it('không có lỗi a11y tự phát hiện được trên màn chi tiết từ', async () => {
    // `a11y.test.tsx` chỉ phủ màn đăng nhập. Màn này là màn có mẫu ARIA phức
    // tạp nhất trong app (tablist + tabpanel + roving tabindex), nên nó là chỗ
    // đáng gác nhất.
    const { container } = renderPage()

    await screen.findByRole('tab', { name: 'Nghĩa', selected: true })

    // Assert thẳng `violations` như `a11y.test.tsx` đang làm — matcher
    // `toHaveNoViolations` của vitest-axe không được đăng ký ở repo này.
    expect((await axe(container)).violations).toEqual([])
  })
})
