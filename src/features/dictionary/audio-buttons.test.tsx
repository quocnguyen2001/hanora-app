import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useVoice } from '@/stores/voice'
import { stubSynth, stubUtterance, voice } from '@/test/speech'
import type { WordDetail } from '@/types/dictionary'
import { WordDetailPage } from './pages/WordDetailPage'

const fetchMock = vi.fn<typeof fetch>()

/** Sáu thuộc tính Hán tự để `null` — hình dạng của response cũ trong cache. */
const noAttributes = {
  radical: null,
  radical_han_viet: null,
  stroke_count: null,
  decomposition: null,
  etymology_type: null,
  stroke_names: null,
}

const word: WordDetail = {
  id: 7,
  simplified: '狐狸',
  traditional: '狐狸',
  pinyin: 'húli',
  han_viet: 'hồ ly',
  definitions_en: ['fox'],
  definitions_vi: ['con cáo'],
  measure_words: [],
  hsk_level: 4,
  characters: [
    // Mọi thuộc tính Hán tự để `null`: test này đo nút audio, và một fixture
    // đầy đủ ở đây chỉ làm loãng thứ nó thật sự khoá.
    { char: '狐', pinyin: 'hú', han_viet: 'hồ', ...noAttributes },
    { char: '狸', pinyin: 'li', han_viet: 'ly', ...noAttributes },
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

/*
 * Giọng nam đứng ĐẦU danh sách, giọng nữ đứng sau: thuật toán chấm điểm chọn
 * `Tingting`, nên bài kiểm tra đổi giọng bên dưới phân biệt được "dùng giọng
 * người dùng chọn" với "lấy đại phần tử đầu tiên".
 */
const VOICES = [voice('Kangkang', 'zh-CN'), voice('Tingting', 'zh-CN')]

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

let spoken: SpeechSynthesisUtterance[] = []

beforeEach(() => {
  stubUtterance()
  spoken = stubSynth(VOICES)
  useVoice.setState({ voiceURI: null })
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

  it('đổi giọng ở cài đặt có hiệu lực ngay, không cần tải lại trang', async () => {
    render(<Harness />)

    const buttons = await screen.findAllByRole('button', { name: 'Phát âm' })
    const first = buttons[0]
    if (!first) throw new Error('không dựng được nút phát âm nào')

    await userEvent.click(first)
    expect(spoken.at(-1)?.voice?.name).toBe('Tingting')

    /*
     * Đổi store mà KHÔNG unmount/remount trang. Test nào dựng lại component
     * giữa hai lần bấm là test rỗng — nó xanh kể cả khi hook chụp giọng một lần
     * lúc mount, tức đúng cái lỗi nó phải bắt.
     */
    useVoice.setState({ voiceURI: 'Kangkang' })

    await userEvent.click(screen.getAllByRole('button', { name: 'Phát âm' })[0] as HTMLElement)

    expect(spoken.at(-1)?.voice?.name).toBe('Kangkang')
  })
})
