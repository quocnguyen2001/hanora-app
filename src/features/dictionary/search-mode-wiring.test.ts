import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchWords } from './api'
import { dictionaryKeys } from './hooks'
import { setTokenReader } from '@/lib/api'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ data: [], meta: { page: 1, per_page: 20, total: 0, hint: null } }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  setTokenReader(null)
})

function calledUrl(): string {
  const input = fetchMock.mock.calls[0]?.[0]

  return typeof input === 'string' ? input : (input as URL).toString()
}

describe('mode đi vào request', () => {
  it('gửi mode khi người dùng đã chọn', async () => {
    await searchWords('xin chào', 'vi')

    expect(calledUrl()).toContain('mode=vi')
  })

  it('KHÔNG gửi mode khi chưa chọn', async () => {
    /*
     * Bỏ hẳn khỏi query string chứ không gửi chuỗi rỗng: `mode=` trượt luật
     * `Rule::in` phía API và trả 422. Thiếu tham số thì API chạy đường auto.
     */
    await searchWords('xin chào', null)

    expect(calledUrl()).not.toContain('mode')
  })
})

describe('query key', () => {
  it('đổi theo mode để bấm toggle là refetch, không phải trả cache cũ', () => {
    // Cùng một `query`, hai mode, hai kết quả hoàn toàn khác nhau. Thiếu mode
    // trong key thì TanStack Query trả lại danh sách cũ và toggle trông như hỏng.
    expect(dictionaryKeys.search('xin chào', 'vi')).not.toEqual(
      dictionaryKeys.search('xin chào', 'cn'),
    )
    expect(dictionaryKeys.search('xin chào', null)).not.toEqual(
      dictionaryKeys.search('xin chào', 'vi'),
    )
  })
})
