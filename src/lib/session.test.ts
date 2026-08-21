import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, setTokenReader, setUnauthenticatedHandler, type ApiError } from './api'
import { clearSession } from './session'
import { useAuthStore } from '@/stores/auth'
import { useRecentSearches } from '@/stores/recent-searches'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  useAuthStore.setState({ token: 'token-cu' })
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  setTokenReader(null)
  setUnauthenticatedHandler(null)
})

describe('clearSession — xóa cả bốn tầng', () => {
  it('xóa token, query cache, Cache Storage và lịch sử tìm kiếm', async () => {
    const deleted: string[] = []

    vi.stubGlobal('caches', {
      keys: () => Promise.resolve(['api-cache', 'shell-cache']),
      delete: (key: string) => {
        deleted.push(key)
        return Promise.resolve(true)
      },
    })

    const queryClient = new QueryClient()
    queryClient.setQueryData(['vocabulary', 'list'], ['dữ liệu của tài khoản A'])
    useRecentSearches.getState().add('con mèo')

    await clearSession(queryClient)

    expect(useAuthStore.getState().token).toBeNull()
    expect(queryClient.getQueryData(['vocabulary', 'list'])).toBeUndefined()
    // Bỏ tầng này thì trên máy dùng chung, tài khoản B bật chế độ máy bay sẽ
    // thấy kho từ của tài khoản A (red team C2).
    expect(deleted).toEqual(['api-cache', 'shell-cache'])
    // Từ khi tìm được bằng nghĩa tiếng Việt, lịch sử tìm kiếm không còn là một
    // danh sách chữ Hán mà là cụm từ tiếng Việt tự do của tài khoản trước.
    expect(useRecentSearches.getState().items).toEqual([])
  })

  it('không nổ khi trình duyệt không có Cache Storage', async () => {
    vi.stubGlobal('caches', undefined)

    await expect(clearSession()).resolves.toBeUndefined()
    expect(useAuthStore.getState().token).toBeNull()
  })
})

describe('phân biệt 401 với lỗi mạng — red team C5', () => {
  it('xóa phiên khi nhận HTTP 401 thật', async () => {
    const onUnauthenticated = vi.fn()
    setUnauthenticatedHandler(onUnauthenticated)
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthenticated.' }), { status: 401 }),
    )

    await apiRequest('/vocabulary').catch(() => undefined)

    expect(onUnauthenticated).toHaveBeenCalledOnce()
  })

  it('KHÔNG xóa phiên khi mất mạng', async () => {
    /*
     * Đây là lỗi phá tiêu chí offline của MVP: bật chế độ máy bay, `me` fail ở
     * tầng mạng, và nếu cái đó cũng xóa phiên thì người dùng bị đá ra khỏi tài
     * khoản đúng lúc họ cần đọc kho từ đã cache.
     */
    const onUnauthenticated = vi.fn()
    setUnauthenticatedHandler(onUnauthenticated)
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = (await apiRequest('/vocabulary').catch((e: unknown) => e)) as ApiError

    expect(error.isNetworkError).toBe(true)
    expect(onUnauthenticated).not.toHaveBeenCalled()
    expect(useAuthStore.getState().token).toBe('token-cu')
  })

  it('KHÔNG xóa phiên khi login trả 401, tránh vòng lặp chuyển hướng', async () => {
    // Sai mật khẩu cũng là 401. Nếu nó kích hoạt "xóa phiên rồi về /login" thì
    // màn đăng nhập tự đá chính nó và người dùng không đọc được thông báo.
    const onUnauthenticated = vi.fn()
    setUnauthenticatedHandler(onUnauthenticated)
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'Sai' }), { status: 401 }))

    await apiRequest('/auth/login', { method: 'POST', body: {} }).catch(() => undefined)

    expect(onUnauthenticated).not.toHaveBeenCalled()
  })
})

describe('gắn token vào request', () => {
  it('gửi Authorization khi đã đăng nhập', async () => {
    setTokenReader(() => 'token-abc')
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: null }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await apiRequest('/auth/me')

    const init = fetchMock.mock.calls[0]?.[1]

    expect(init?.headers).toMatchObject({ Authorization: 'Bearer token-abc' })
  })

  it('không gửi Authorization khi chưa đăng nhập', async () => {
    setTokenReader(() => null)
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: null }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await apiRequest('/auth/me')

    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty('Authorization')
  })
})

describe('chặn thao tác ghi khi ngoại tuyến — D4', () => {
  it('từ chối POST với thông điệp nói rõ cần kết nối', async () => {
    // Offline chỉ ĐỌC. Không hàng đợi mutation, không sync/merge ở MVP — nên
    // thao tác ghi phải báo lỗi rõ ràng thay vì giả vờ đã lưu.
    vi.stubGlobal('navigator', { onLine: false })

    const error = (await apiRequest('/vocabulary', {
      method: 'POST',
      body: { word_id: 1 },
    }).catch((e: unknown) => e)) as ApiError

    expect(error.isOfflineWrite).toBe(true)
    expect(error.message).toBe('Bạn đang ngoại tuyến. Thao tác này cần kết nối.')
    // Quan trọng: KHÔNG hề gọi fetch, nên không có gì âm thầm thành công.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('vẫn cho phép ĐỌC khi ngoại tuyến để service worker phục vụ từ cache', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(apiRequest('/vocabulary')).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('không nhầm lỗi mạng thường thành offline write', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = (await apiRequest('/vocabulary', { method: 'POST', body: {} }).catch(
      (e: unknown) => e,
    )) as ApiError

    expect(error.isNetworkError).toBe(true)
    expect(error.isOfflineWrite).toBe(false)
  })
})
