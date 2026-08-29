import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTokenReader } from '@/lib/api'
import { fetchWordIllustration } from './api'

/**
 * Trạng thái ảnh nằm ở `meta.status`, KHÔNG ở mã HTTP: `apiRequestWithMeta`
 * không phơi ra `response.status` khi thành công, nên 200 (`ready`/`none`) và
 * 202 (`pending`) đi vào cùng một đường. Đọc nhầm chỗ là hỏng im lặng.
 */
const fetchMock = vi.fn<typeof fetch>()

function respond(body: unknown, status = 200): void {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

const readyPayload = {
  url: 'https://cdn.pixabay.com/photo/x/y_640.jpg',
  preview_url: 'https://cdn.pixabay.com/photo/x/y_150.jpg',
  width: 640,
  height: 426,
  author: 'NoName_13',
  author_url: 'https://pixabay.com/users/NoName_13-2364555/',
  page_url: 'https://pixabay.com/photos/y/',
  source: 'pixabay',
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  setTokenReader(null)
})

describe('đọc ảnh minh hoạ', () => {
  it('trả ảnh kèm ghi công khi status ready', async () => {
    respond({ data: readyPayload, meta: { status: 'ready' } })

    const result = await fetchWordIllustration(1)

    expect(result.status).toBe('ready')
    expect(result.illustration?.url).toBe(readyPayload.url)
    // Ghi công là nghĩa vụ ToS Pixabay — mất nó là dùng ảnh sai điều khoản.
    expect(result.illustration?.author).toBe('NoName_13')
    expect(result.illustration?.page_url).toBe(readyPayload.page_url)
  })

  it('KHÔNG ném khi cổng đã đóng — none là câu trả lời thành công', async () => {
    // Hư từ và từ trừu tượng chiếm một phần lớn từ điển. Coi `none` là lỗi sẽ
    // làm màn chi tiết hiện khối lỗi cho một tình huống hoàn toàn bình thường.
    respond({ data: null, meta: { status: 'none' } })

    const result = await fetchWordIllustration(1)

    expect(result.status).toBe('none')
    expect(result.illustration).toBeNull()
  })

  it('đọc pending từ meta chứ không từ mã 202', async () => {
    respond({ data: null, meta: { status: 'pending' } }, 202)

    expect((await fetchWordIllustration(1)).status).toBe('pending')
  })

  it('coi meta.status lạ là unavailable thay vì tin bừa', async () => {
    respond({ data: null, meta: { status: 'chuyen-la' } })

    expect((await fetchWordIllustration(1)).status).toBe('unavailable')
  })
})

describe('kiểm hình dạng payload', () => {
  it('bỏ ảnh thiếu url thay vì render img rỗng', async () => {
    respond({ data: { author: 'ai do', source: 'pixabay' }, meta: { status: 'ready' } })

    expect((await fetchWordIllustration(1)).illustration).toBeNull()
  })

  it('bỏ ảnh có url rỗng', async () => {
    respond({ data: { ...readyPayload, url: '   ' }, meta: { status: 'ready' } })

    expect((await fetchWordIllustration(1)).illustration).toBeNull()
  })

  it('chuẩn hoá trường phụ sai kiểu về null, không làm hỏng cả ảnh', async () => {
    // Một trường ghi công hỏng không được phép làm mất luôn tấm ảnh.
    respond({
      data: { ...readyPayload, author: 42, width: 'to', page_url: '' },
      meta: { status: 'ready' },
    })

    const illustration = (await fetchWordIllustration(1)).illustration

    expect(illustration?.url).toBe(readyPayload.url)
    expect(illustration?.author).toBeNull()
    expect(illustration?.width).toBeNull()
    expect(illustration?.page_url).toBeNull()
  })
})
