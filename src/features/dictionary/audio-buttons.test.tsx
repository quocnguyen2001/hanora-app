import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WordDetail } from '@/types/dictionary'
import { WordDetailPage } from './pages/WordDetailPage'

const fetchMock = vi.fn<typeof fetch>()

const word: WordDetail = {
  id: 7,
  simplified: '狐狸',
  traditional: '狐狸',
  pinyin: 'húli',
  han_viet: 'hồ ly',
  definitions_en: ['fox'],
  definitions_vi: ['con cáo'],
  hsk_level: 4,
  characters: [
    { char: '狐', pinyin: 'hú', han_viet: 'hồ' },
    { char: '狸', pinyin: 'li', han_viet: 'ly' },
  ],
  examples: [
    {
      id: 11,
      sentence_zh: '狐狸躲在了空心树里面。',
      translation_en: 'The fox hid in the hollow tree.',
      contributor: 'nickyeow',
      license: 'CC BY 2.0 FR',
    },
    {
      id: 12,
      sentence_zh: '白兔的耳朵比狐狸长。',
      translation_en: 'The ears of a rabbit are longer than those of a fox.',
      contributor: 'nickyeow',
      license: 'CC BY 2.0 FR',
    },
  ],
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** jsdom KHÔNG có `speechSynthesis`; không giả lập thì mọi nút đều `unsupported`. */
function stubSpeech(): void {
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => [{ name: 'Tingting', lang: 'zh-CN', localService: true }],
    cancel: vi.fn(),
    speak: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string
      voice: SpeechSynthesisVoice | null = null
      lang = ''
      rate = 1
      pitch = 1
      constructor(text: string) {
        this.text = text
      }
      // Không bắn `end`: câu ở trạng thái đang đọc suốt bài kiểm tra.
      addEventListener() {}
    },
  )
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
  stubSpeech()
  fetchMock.mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    if (url.includes('/example-translations')) {
      return Promise.resolve(json({ data: [], meta: { status: 'unavailable' } }))
    }

    if (url.includes('/vocabulary/ids')) return Promise.resolve(json({ data: [] }))

    return Promise.resolve(json({ data: word }))
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('nút phát âm ở trang chi tiết từ', () => {
  it('chỉ nút vừa bấm chuyển sang đang phát, các nút còn lại giữ nguyên', async () => {
    // Cả trang dùng chung một `useSpeech`. Nếu trạng thái chỉ là một cờ boolean
    // thì bấm một câu sẽ làm SÁNG cả loạt nút — đúng lỗi người dùng thấy.
    render(<Harness />)

    const buttons = await screen.findAllByRole('button', { name: 'Phát âm' })
    expect(buttons.length).toBeGreaterThan(1)

    const last = buttons.at(-1)
    if (!last) throw new Error('không dựng được nút phát âm nào')

    await userEvent.click(last)

    expect(screen.getAllByRole('button', { name: 'Đang phát' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Phát âm' })).toHaveLength(buttons.length - 1)
  })
})
