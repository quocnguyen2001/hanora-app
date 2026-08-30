import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubSynth, stubUtterance, voice } from '@/test/speech'
import { listChineseVoices, speak } from './audio'

beforeEach(() => {
  stubUtterance()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('chọn giọng đọc', () => {
  it('bỏ qua giọng nam đứng đầu danh sách để lấy giọng nữ', () => {
    const spoken = stubSynth([voice('Kangkang', 'zh-CN'), voice('Tingting', 'zh-CN')])

    expect(speak('你好')).toBe(true)
    expect(spoken[0]?.voice?.name).toBe('Tingting')
  })

  it('ưu tiên phổ thông đại lục khi cả hai đều là giọng nữ', () => {
    const spoken = stubSynth([voice('Meijia', 'zh-TW'), voice('Tingting', 'zh-CN')])

    speak('你好')

    expect(spoken[0]?.voice?.name).toBe('Tingting')
  })

  it('vẫn dùng giọng lạ khi không tên nào khớp danh sách', () => {
    const spoken = stubSynth([voice('Chinese Voice 1', 'zh-CN')])

    expect(speak('你好')).toBe(true)
    expect(spoken[0]?.voice?.name).toBe('Chinese Voice 1')
  })

  it('không phát khi máy không có giọng tiếng Trung nào', () => {
    const spoken = stubSynth([voice('Samantha', 'en-US')])

    expect(speak('你好')).toBe(false)
    expect(spoken).toHaveLength(0)
  })

  it('đọc chậm và cao giọng hơn mặc định', () => {
    const spoken = stubSynth([voice('Tingting', 'zh-CN')])

    speak('你好')

    expect(spoken[0]?.rate).toBeLessThan(1)
    expect(spoken[0]?.pitch).toBeGreaterThan(1)
  })
})

describe('giọng người dùng chọn', () => {
  it('dùng đúng giọng được chỉ định, kể cả khi giọng đó thua điểm', () => {
    const spoken = stubSynth([voice('Tingting', 'zh-CN'), voice('Kangkang', 'zh-CN')])

    // Đây là lý do cả tính năng tồn tại: người dùng ĐÈ LÊN thuật toán chấm
    // điểm. Chọn giọng nam mà vẫn ra giọng nữ thì màn cài đặt là đồ trang trí.
    speak('你好', { voiceURI: 'Kangkang' })

    expect(spoken[0]?.voice?.name).toBe('Kangkang')
  })

  it('rơi về giọng chấm điểm cao nhất khi giọng đã lưu không còn trên máy', () => {
    const spoken = stubSynth([voice('Kangkang', 'zh-CN'), voice('Tingting', 'zh-CN')])

    // Đổi máy, đổi trình duyệt, iOS gỡ giọng. Đường rơi phải PHÁT ĐƯỢC — im
    // lặng thất bại ở đây nghĩa là nút loa chết vì một lựa chọn cũ.
    expect(speak('你好', { voiceURI: 'Giọng đã gỡ' })).toBe(true)
    expect(spoken[0]?.voice?.name).toBe('Tingting')
  })

  it('`null` nghĩa là để app tự chấm điểm, hệt như trước khi có tính năng', () => {
    const spoken = stubSynth([voice('Kangkang', 'zh-CN'), voice('Tingting', 'zh-CN')])

    speak('你好', { voiceURI: null })

    expect(spoken[0]?.voice?.name).toBe('Tingting')
  })
})

describe('listChineseVoices', () => {
  it('chỉ trả giọng tiếng Trung, bỏ hết phần còn lại', () => {
    stubSynth([voice('Samantha', 'en-US'), voice('Tingting', 'zh-CN'), voice('Kyoko', 'ja-JP')])

    expect(listChineseVoices().map((option) => option.name)).toEqual(['Tingting'])
  })

  it('phần tử đầu chính là giọng chế độ Tự động sẽ chọn', () => {
    const voices = [
      voice('Kangkang', 'zh-CN'),
      voice('Meijia', 'zh-TW'),
      voice('Tingting', 'zh-CN'),
    ]
    const spoken = stubSynth(voices)

    speak('你好')

    // Màn cài đặt nói ra tên ở `[0]` như "giọng đang dùng". Nếu hai cái này lệch
    // nhau thì màn đó nói dối người dùng.
    expect(listChineseVoices()[0]?.name).toBe(spoken[0]?.voice?.name)
  })

  it('mang theo cờ giọng cài sẵn trên máy', () => {
    stubSynth([voice('Tingting', 'zh-CN', false)])

    expect(listChineseVoices()[0]?.local).toBe(false)
  })

  it('trả danh sách rỗng khi máy không có giọng tiếng Trung nào', () => {
    stubSynth([voice('Samantha', 'en-US')])

    expect(listChineseVoices()).toEqual([])
  })
})
