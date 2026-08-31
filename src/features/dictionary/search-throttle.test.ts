import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchWords } from './api'
import { isSearchableQuery } from './hooks'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ data: [], meta: { page: 1, per_page: 20, total: 0 } }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('ngưỡng gọi API', () => {
  it('một chữ cái latin chưa đáng gọi API', () => {
    expect(isSearchableQuery('h')).toBe(false)
    expect(isSearchableQuery('  h  ')).toBe(false)
  })

  it('một chữ Hán đơn là truy vấn đầy đủ', () => {
    expect(isSearchableQuery('好')).toBe(true)
  })

  it('từ latin từ hai ký tự trở lên thì gọi', () => {
    expect(isSearchableQuery('ho')).toBe(true)
    expect(isSearchableQuery('học tập')).toBe(true)
  })

  it('chuỗi rỗng không bao giờ gọi', () => {
    expect(isSearchableQuery('')).toBe(false)
    expect(isSearchableQuery('   ')).toBe(false)
  })
})

describe('hủy request cũ', () => {
  it('chuyển signal xuống fetch để gõ tiếp là cắt request trước', async () => {
    const controller = new AbortController()

    await searchWords('học tập', 'vi', { signal: controller.signal })

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal)
  })

  it('lỗi hủy giữ nguyên AbortError, không hóa thành lỗi mạng', async () => {
    const controller = new AbortController()
    fetchMock.mockImplementation(() => {
      controller.abort()
      return Promise.reject(new DOMException('Aborted', 'AbortError'))
    })

    await expect(searchWords('học tập', 'vi', { signal: controller.signal })).rejects.toMatchObject(
      {
        name: 'AbortError',
      },
    )
  })
})
