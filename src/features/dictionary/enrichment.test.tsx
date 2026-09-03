import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
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
  definitions_vi: ['học tập, nghiên cứu'],
  measure_words: [],
  hsk_level: 1,
  characters: [],
  examples: [],
}

const readyPayload = {
  data: {
    senses: [
      { pos: 'động từ', vi: 'học, học tập' },
      { pos: 'động từ', vi: 'noi theo, học hỏi', note: 'thường dùng với người' },
      { pos: 'danh từ', vi: 'việc học' },
    ],
    related_words: [
      { simplified: '学生', pinyin: 'xuéshēng', vi: 'học sinh', word_id: 42 },
      { simplified: '自学', pinyin: 'zìxué', vi: 'tự học', word_id: null },
    ],
    idioms: [{ simplified: '学以致用', pinyin: 'xuéyǐzhìyòng', vi: 'học đi đôi với hành' }],
    usage_note: 'Trang trọng hơn 学 khi đứng một mình.',
    source: 'ai',
    model: 'gemini-2.0-flash',
  },
  meta: { status: 'ready' },
}

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
 * Trang chi tiết gọi song song nhiều endpoint, nên phải định tuyến theo URL —
 * một `mockResolvedValue` duy nhất sẽ trả cùng payload cho tất cả.
 */
function route(enrichment: () => Response, detail: WordDetail = word): void {
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)

    if (url.includes('/enrichment')) return Promise.resolve(enrichment())
    if (url.includes('/vocabulary/ids')) return Promise.resolve(json({ data: [] }))

    if (url.includes('/illustration') || url.includes('/example-translations')) {
      return Promise.resolve(json({ data: null, meta: { status: 'unavailable' } }))
    }

    return Promise.resolve(json({ data: detail }))
  })
}

/**
 * `tab` đi qua URL chứ không qua một cú click.
 *
 * Ngắn hơn thì đúng, nhưng lý do chính là nó kiểm luôn hợp đồng deep-link: mỗi
 * tab của màn chi tiết phải mở thẳng được bằng `?tab=`, vì đó là thứ giữ đúng
 * chỗ người dùng đang đứng khi họ bấm Back từ một từ ghép.
 *
 * Tương tác tab (bấm, mũi tên, roving tabindex) test ở `TabView` — không lặp
 * lại ở đây.
 */
function Harness({ tab }: { tab?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/words/${word.id}${tab ? `?tab=${tab}` : ''}`]}>
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

describe('lớp làm giàu trên màn chi tiết từ', () => {
  it('nhóm nghĩa theo từ loại, mỗi từ loại một lần', async () => {
    // Model trả danh sách PHẲNG và lặp lại `pos` ở hai mục rời nhau — gom lại
    // là việc của FE, và "động từ" phải xuất hiện đúng một lần.
    route(() => json(readyPayload))

    render(<Harness />)

    expect(await screen.findByText('học, học tập')).toBeInTheDocument()
    expect(screen.getAllByText('động từ')).toHaveLength(1)
    expect(screen.getByText('danh từ')).toBeInTheDocument()
    expect(screen.getByText('noi theo, học hỏi')).toBeInTheDocument()
    expect(screen.getByText('thường dùng với người')).toBeInTheDocument()
  })

  it('nghĩa Việt nhường chỗ cho senses trong tab, nhưng nghĩa Anh Ở LẠI', async () => {
    // Luật R1: `definitions_en` không bao giờ bị thay thế — và càng phải ở lại
    // khi thứ thay chỗ nghĩa Việt là nội dung AI chưa ai rà.
    route(() => json(readyPayload))

    render(<Harness />)

    await screen.findByText('học, học tập')
    expect(screen.queryByText('học tập, nghiên cứu')).not.toBeInTheDocument()
    expect(screen.getByText('to learn')).toBeInTheDocument()
  })

  it('giữ nghĩa Việt khi chưa có senses', async () => {
    route(() => json({ data: null, meta: { status: 'unavailable' } }))

    render(<Harness />)

    expect(await screen.findByText('học tập, nghiên cứu')).toBeInTheDocument()
  })

  it('mục từ ghép có word_id thì bấm được, không có thì tĩnh', async () => {
    // Một chip trông bấm được mà bấm không ra gì tệ hơn một chip tĩnh — cùng
    // luật mà `SentenceToken.word_id: null` đang giữ.
    route(() => json(readyPayload))

    render(<Harness tab="vidu" />)

    const link = await screen.findByRole('link', { name: /学生/ })
    expect(link).toHaveAttribute('href', '/words/42')
    expect(screen.queryByRole('link', { name: /自学/ })).not.toBeInTheDocument()
    expect(screen.getByText('自学')).toBeInTheDocument()
  })

  it('gắn nhãn nguồn AI đúng một lần cho MỖI khối', async () => {
    /*
     * Bốn khối AI vẫn còn nguyên, nhưng chia sang HAI tab: nghĩa theo từ loại +
     * ghi chú dùng từ ở "Nghĩa", từ ghép + thành ngữ ở "Ví dụ".
     *
     * Đếm theo TAB chứ không đếm cả trang, và đó là điểm của test: luật là một
     * nhãn cho mỗi KHỐI, không phải một nhãn cho mỗi trang. Gộp thành một nhãn
     * duy nhất ở đầu trang sẽ đọc ra như thể cả trang do AI sinh — trong khi
     * chữ Hán, số nét và câu ví dụ đều có nguồn thật.
     */
    route(() => json(readyPayload))

    const { unmount } = render(<Harness />)

    await screen.findByText('học, học tập')
    expect(screen.getAllByText(/do AI sinh/i)).toHaveLength(2)

    unmount()
    render(<Harness tab="vidu" />)

    await screen.findByText('học sinh')
    expect(screen.getAllByText(/do AI sinh/i)).toHaveLength(2)
  })

  it('ẩn HẲN mọi khối khi unavailable', async () => {
    // `unavailable` không phải lỗi — màn hình phải trông đúng như trước khi có
    // tính năng này, không khung trống, không dòng "chưa có".
    route(() => json({ data: null, meta: { status: 'unavailable' } }))

    const { unmount } = render(<Harness />)

    await screen.findByText('to learn')
    expect(screen.queryByText('Nghĩa theo từ loại')).not.toBeInTheDocument()
    expect(screen.queryByText('Ghi chú dùng từ')).not.toBeInTheDocument()
    expect(screen.queryByText(/do AI sinh/i)).not.toBeInTheDocument()

    unmount()
    render(<Harness tab="vidu" />)

    // Từ này không có câu ví dụ VÀ không có bản làm giàu → tab rỗng thật, và nó
    // phải NÓI RA vì sao thay vì biến mất khỏi thanh tab.
    await screen.findByText('Chưa có ví dụ cho từ này')
    expect(screen.queryByText('Từ ghép')).not.toBeInTheDocument()
    expect(screen.queryByText('Thành ngữ')).not.toBeInTheDocument()
    expect(screen.queryByText(/do AI sinh/i)).not.toBeInTheDocument()
  })

  it('bỏ mục hỏng mà không mất cả khối', async () => {
    // Một mục thiếu `vi` chỉ được làm mất chính nó — cùng tinh thần phòng vệ mà
    // `parseIllustration` đang giữ.
    route(() =>
      json({
        data: {
          senses: [{ pos: 'động từ', vi: 'học' }, { pos: 'danh từ' }],
          related_words: [{ pinyin: 'xuéshēng', vi: 'học sinh' }],
          idioms: [],
          usage_note: null,
        },
        meta: { status: 'ready' },
      }),
    )

    const { unmount } = render(<Harness />)

    expect(await screen.findByText('học')).toBeInTheDocument()
    expect(screen.queryByText('danh từ')).not.toBeInTheDocument()

    unmount()
    render(<Harness tab="vidu" />)

    // `related_words` mất mục duy nhất vì thiếu `simplified` → cả khối biến mất.
    await screen.findByRole('tab', { name: 'Ví dụ', selected: true })
    expect(screen.queryByText('Từ ghép')).not.toBeInTheDocument()
  })

  it('KHÔNG hứa khung xương khi đã có nghĩa Việt để đọc', async () => {
    /*
     * Bất biến SIẾT LẠI khi hai danh sách nghĩa chuyển từ hero xuống tab.
     *
     * Trước đây khối làm giàu là một thẻ RIÊNG nằm dưới hero, nên lúc đang sinh
     * nó treo một khung xương — chấp nhận được, vì nghĩa Việt vẫn hiện ở hero
     * ngay bên trên.
     *
     * Giờ cả hai ở CHUNG một panel. Treo khung xương bên dưới một danh sách
     * nghĩa đã đọc được là hứa thêm một thứ mà `unavailable` — kết cục thường
     * gặp — sẽ lặng lẽ rút lại. Từ đã có nghĩa Việt thì không hứa gì cả.
     *
     * Đếm qua `.animate-skeleton` chứ không `data-testid`: `Skeleton` không có
     * testid, nên một selector không khớp gì sẽ làm assert này luôn đúng —
     * đúng lỗi mà bản đầu của test này mắc.
     */
    route(() => json({ data: null, meta: { status: 'pending' } }, 202))

    const { container } = render(<Harness />)

    await screen.findByText('học tập, nghiên cứu')
    expect(container.querySelectorAll('.animate-skeleton')).toHaveLength(0)
    expect(screen.queryByText('Nghĩa theo từ loại')).not.toBeInTheDocument()
  })

  it('hiện MỘT khối khung xương khi từ CHƯA có nghĩa Việt nào', async () => {
    // ~7% từ không có trong CVDICT. Với chúng, lớp làm giàu là hy vọng DUY NHẤT
    // có nghĩa tiếng Việt, nên chờ nó là chờ một thứ đáng chờ — và khung xương
    // là cách nói "sắp có gì ở đây" mà `ux-rules.md` yêu cầu.
    route(() => json({ data: null, meta: { status: 'pending' } }, 202), {
      ...word,
      definitions_vi: null,
    })

    const { container } = render(<Harness />)

    await screen.findByText('to learn')
    // MỘT khối, hai vạch — không phải bốn khung trống xếp chồng.
    expect(container.querySelectorAll('.animate-skeleton')).toHaveLength(2)
  })

  it('KHÔNG hiện khung xương khi unavailable', async () => {
    route(() => json({ data: null, meta: { status: 'unavailable' } }))

    const { container } = render(<Harness />)

    await screen.findByText('to learn')
    expect(container.querySelectorAll('.animate-skeleton')).toHaveLength(0)
  })
})
