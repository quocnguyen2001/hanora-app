import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTokenReader } from '@/lib/api'
import { searchWords } from './api'

/**
 * `translation` là trường cấp cao THỨ BA của response, ngang hàng `data` và
 * `meta`. `ApiEnvelope` chỉ khai báo hai trường đầu, nên nếu client không đọc
 * đúng thì trường này tồn tại ở runtime mà app không bao giờ thấy — đúng cách
 * hỏng im lặng mà bộ test này chặn.
 */
const fetchMock = vi.fn<typeof fetch>()

function respond(body: unknown): void {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }),
  )
}

function envelope(translation: unknown): unknown {
  return {
    data: [],
    meta: { page: 1, per_page: 20, total: 0, hint: null, source: 'ai' },
    translation,
  }
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  setTokenReader(null)
})

describe('đọc được câu dịch', () => {
  it('lấy zh, pinyin và gắn nhãn nguồn', async () => {
    respond(
      envelope({
        zh: '你还记得我吗？',
        pinyin: 'nǐ hái jìde wǒ ma?',
        vi: 'bạn có nhớ tôi không?',
        source: 'ai',
      }),
    )

    const { translation } = await searchWords('bạn có nhớ tôi không?', 'vi')

    expect(translation).toEqual({
      zh: '你还记得我吗？',
      pinyin: 'nǐ hái jìde wǒ ma?',
      vi: 'bạn có nhớ tôi không?',
      source: 'ai',
    })
  })

  it('cắt khoảng trắng thừa', async () => {
    respond(envelope({ zh: '  我爱你  ', pinyin: ' wǒ ài nǐ ', vi: '', source: 'ai' }))

    const { translation } = await searchWords('anh yêu em', 'vi')

    expect(translation?.zh).toBe('我爱你')
    expect(translation?.pinyin).toBe('wǒ ài nǐ')
  })
})

describe('không tin dữ liệu do AI sinh', () => {
  it('trả null khi thiếu hẳn trường', async () => {
    respond({ data: [], meta: { page: 1, per_page: 20, total: 0, hint: null, source: 'sql' } })

    const { translation } = await searchWords('học sinh', 'vi')

    expect(translation).toBeNull()
  })

  it.each([
    ['null', null],
    ['chuỗi thay vì object', 'không phải object'],
    ['thiếu zh', { pinyin: 'wǒ ài nǐ', vi: 'x', source: 'ai' }],
    ['thiếu pinyin', { zh: '我爱你', vi: 'x', source: 'ai' }],
    ['zh rỗng sau khi trim', { zh: '   ', pinyin: 'wǒ ài nǐ', vi: 'x', source: 'ai' }],
    ['kiểu sai hoàn toàn', { zh: 42, pinyin: [], vi: null }],
  ])('trả null khi %s', async (_label, raw) => {
    // Một trường phụ hỏng KHÔNG được phép làm hỏng cả kết quả tìm kiếm.
    respond(envelope(raw))

    const result = await searchWords('anh yêu em', 'vi')

    expect(result.translation).toBeNull()
    expect(result.words).toEqual([])
  })

  it('vẫn trả danh sách từ khi câu dịch hỏng', async () => {
    respond({
      data: [{ id: 1, simplified: '爱' }],
      meta: { page: 1, per_page: 20, total: 1, hint: null, source: 'ai' },
      translation: { zh: '', pinyin: '' },
    })

    const result = await searchWords('anh yêu em', 'vi')

    expect(result.translation).toBeNull()
    expect(result.words).toHaveLength(1)
  })
})
