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
function route(enrichment: () => Response): void {
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)

    if (url.includes('/enrichment')) return Promise.resolve(enrichment())
    if (url.includes('/vocabulary/ids')) return Promise.resolve(json({ data: [] }))

    if (url.includes('/illustration') || url.includes('/example-translations')) {
      return Promise.resolve(json({ data: null, meta: { status: 'unavailable' } }))
    }

    return Promise.resolve(json({ data: word }))
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

  it('nghĩa Việt của hero nhường chỗ cho senses, nhưng nghĩa Anh Ở LẠI', async () => {
    // Luật R1: `definitions_en` không bao giờ bị thay thế — và càng phải ở lại
    // khi thứ thay chỗ nghĩa Việt là nội dung AI chưa ai rà.
    route(() => json(readyPayload))

    render(<Harness />)

    await screen.findByText('học, học tập')
    expect(screen.queryByText('học tập, nghiên cứu')).not.toBeInTheDocument()
    expect(screen.getByText('to learn')).toBeInTheDocument()
  })

  it('giữ nghĩa Việt của hero khi chưa có senses', async () => {
    route(() => json({ data: null, meta: { status: 'unavailable' } }))

    render(<Harness />)

    expect(await screen.findByText('học tập, nghiên cứu')).toBeInTheDocument()
  })

  it('mục từ ghép có word_id thì bấm được, không có thì tĩnh', async () => {
    // Một chip trông bấm được mà bấm không ra gì tệ hơn một chip tĩnh — cùng
    // luật mà `SentenceToken.word_id: null` đang giữ.
    route(() => json(readyPayload))

    render(<Harness />)

    const link = await screen.findByRole('link', { name: /学生/ })
    expect(link).toHaveAttribute('href', '/words/42')
    expect(screen.queryByRole('link', { name: /自学/ })).not.toBeInTheDocument()
    expect(screen.getByText('自学')).toBeInTheDocument()
  })

  it('gắn nhãn nguồn AI đúng một lần cho MỖI khối', async () => {
    route(() => json(readyPayload))

    render(<Harness />)

    await screen.findByText('học, học tập')
    // Bốn khối: nghĩa theo từ loại, ghi chú dùng từ, từ ghép, thành ngữ.
    expect(screen.getAllByText(/do AI sinh/i)).toHaveLength(4)
  })

  it('ẩn HẲN mọi khối khi unavailable', async () => {
    // `unavailable` không phải lỗi — màn hình phải trông đúng như trước khi có
    // tính năng này, không khung trống, không dòng "chưa có".
    route(() => json({ data: null, meta: { status: 'unavailable' } }))

    render(<Harness />)

    await screen.findByText('to learn')
    expect(screen.queryByText('Nghĩa theo từ loại')).not.toBeInTheDocument()
    expect(screen.queryByText('Từ ghép')).not.toBeInTheDocument()
    expect(screen.queryByText('Thành ngữ')).not.toBeInTheDocument()
    expect(screen.queryByText('Ghi chú dùng từ')).not.toBeInTheDocument()
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

    render(<Harness />)

    expect(await screen.findByText('học')).toBeInTheDocument()
    expect(screen.queryByText('danh từ')).not.toBeInTheDocument()
    // `related_words` mất mục duy nhất vì thiếu `simplified` → cả khối biến mất.
    expect(screen.queryByText('Từ ghép')).not.toBeInTheDocument()
  })

  it('hiện MỘT khối khung xương trong lúc sinh, không phải bốn', async () => {
    // Bốn khung trống xếp chồng cho một từ hoá ra không có bản làm giàu là hứa
    // hẹn bốn thứ rồi rút lại cả bốn.
    //
    // Đếm qua `.animate-skeleton` chứ không `data-testid`: `Skeleton` không có
    // testid, nên một selector không khớp gì sẽ làm assert này luôn đúng —
    // đúng lỗi mà bản đầu của test này mắc.
    route(() => json({ data: null, meta: { status: 'pending' } }, 202))

    const { container } = render(<Harness />)

    await screen.findByText('to learn')
    expect(container.querySelectorAll('.animate-skeleton')).toHaveLength(3)
    expect(screen.queryByText('Nghĩa theo từ loại')).not.toBeInTheDocument()
  })

  it('KHÔNG hiện khung xương khi unavailable', async () => {
    route(() => json({ data: null, meta: { status: 'unavailable' } }))

    const { container } = render(<Harness />)

    await screen.findByText('to learn')
    expect(container.querySelectorAll('.animate-skeleton')).toHaveLength(0)
  })
})
