import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, apiRequestWithMeta } from './api'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

/** URL cuối cùng mà api.ts gọi tới. */
function calledUrl(): string {
  const input = fetchMock.mock.calls[0]?.[0]
  // api.ts luôn truyền string; nếu một ngày nó đổi sang Request/URL thì test
  // này gãy ngay tại đây thay vì so sánh nhầm '[object Object]'.
  if (typeof input !== 'string') {
    throw new TypeError(`fetch được gọi với ${typeof input}, mong đợi string`)
  }
  return input
}

function calledInit(): RequestInit {
  return fetchMock.mock.calls[0]?.[1] ?? {}
}

describe('apiRequest', () => {
  it('bóc lớp data ra khỏi envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 1, hanzi: '学习' } }))

    await expect(apiRequest('/dictionary/words/1')).resolves.toEqual({ id: 1, hanzi: '学习' })
  })

  it('giữ lại meta khi caller cần phân trang', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], meta: { total: 0 } }))

    await expect(apiRequestWithMeta('/dictionary/search')).resolves.toEqual({
      data: [],
      meta: { total: 0 },
    })
  })

  // Test chạy không có VITE_API_URL — đúng bằng hình dạng production, nơi FE
  // và API chung origin (D12) nên đường dẫn là tương đối.
  it('thêm prefix /api và bỏ qua query rỗng', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null }))

    await apiRequest('/dictionary/search', { query: { q: '学', page: 2, cursor: undefined } })

    expect(calledUrl()).toBe('/api/dictionary/search?q=%E5%AD%A6&page=2')
  })

  it('chấp nhận path không có dấu / đứng đầu', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null }))

    await apiRequest('health')

    expect(calledUrl()).toBe('/api/health')
  })

  it('chỉ gắn Content-Type khi thật sự có body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null }))

    await apiRequest('/vocabulary')

    expect(calledInit().headers).not.toHaveProperty('Content-Type')
  })

  it('serialize body thành JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 9 } }, 201))

    await apiRequest('/vocabulary', { method: 'POST', body: { word_id: 42 } })

    expect(calledInit().body).toBe('{"word_id":42}')
    expect(calledInit().headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('giữ nguyên header do caller truyền vào', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null }))

    await apiRequest('/auth/me', { headers: { Authorization: 'Bearer abc' } })

    expect(calledInit().headers).toMatchObject({
      Accept: 'application/json',
      Authorization: 'Bearer abc',
    })
  })

  it('coi 204 là thành công, không phải response sai định dạng', async () => {
    // DELETE /api/vocabulary/{id} trả 204. Ném lỗi ở đây sẽ làm optimistic
    // update rollback một thao tác xóa đã chạy xong trên server.
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(apiRequest('/vocabulary/7', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})

describe('ApiError', () => {
  it('mang theo lỗi validation 422 để hiển thị tại từng field', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { message: 'Dữ liệu không hợp lệ.', errors: { email: ['Email đã được dùng.'] } },
        422,
      ),
    )

    const error = await apiRequest('/auth/register', { method: 'POST', body: {} }).catch(
      (e: unknown) => e,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      message: 'Dữ liệu không hợp lệ.',
      errors: { email: ['Email đã được dùng.'] },
    })
    expect((error as ApiError).isValidationError).toBe(true)
  })

  it('nhận diện 401 để đá về màn đăng nhập', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Unauthenticated.' }, 401))

    const error = (await apiRequest('/auth/me').catch((e: unknown) => e)) as ApiError

    expect(error.isUnauthenticated).toBe(true)
    expect(error.isNetworkError).toBe(false)
  })

  it('phân biệt mất mạng với lỗi máy chủ', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = (await apiRequest('/auth/me').catch((e: unknown) => e)) as ApiError

    expect(error.status).toBe(0)
    expect(error.isNetworkError).toBe(true)
    expect(error.message).toBe('Không kết nối được tới máy chủ.')
  })

  it('không nuốt AbortError thành lỗi mạng', async () => {
    // P7 hủy request cũ ở mỗi phím gõ. Nếu việc hủy đó biến thành ApiError
    // status 0 thì UI báo "mất mạng" và query client retry request vừa bị hủy.
    const controller = new AbortController()
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    fetchMock.mockRejectedValue(abortError)
    controller.abort()

    const error: unknown = await apiRequest('/dictionary/search', {
      signal: controller.signal,
    }).catch((e: unknown) => e)

    expect(error).toBe(abortError)
    expect(error).not.toBeInstanceOf(ApiError)
  })

  it('giữ nguyên nhân gốc trong `cause` khi mất mạng', async () => {
    const cause = new TypeError('Failed to fetch')
    fetchMock.mockRejectedValue(cause)

    const error = (await apiRequest('/auth/me').catch((e: unknown) => e)) as ApiError

    expect(error.isNetworkError).toBe(true)
    expect(error.cause).toBe(cause)
  })

  it('không giả vờ thành công khi server trả HTML thay vì JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>502 Bad Gateway</html>', { status: 502 }))

    const error = (await apiRequest('/auth/me').catch((e: unknown) => e)) as ApiError

    expect(error.status).toBe(502)
    expect(error.message).toBe('Máy chủ trả về dữ liệu không đọc được.')
  })

  it('từ chối response 200 thiếu lớp data', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }))

    const error = (await apiRequest('/dictionary/words/1').catch((e: unknown) => e)) as ApiError

    expect(error.message).toBe('Phản hồi từ máy chủ sai định dạng.')
  })

  it('dùng message mặc định khi server không gửi message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500))

    const error = (await apiRequest('/auth/me').catch((e: unknown) => e)) as ApiError

    expect(error.message).toBe('Đã có lỗi xảy ra. Vui lòng thử lại.')
  })
})
