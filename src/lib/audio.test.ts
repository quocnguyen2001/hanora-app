import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { speak } from './audio'

/*
 * jsdom KHÔNG có `speechSynthesis`. Giả lập tối thiểu đúng phần code đọc tới:
 * danh sách giọng, `cancel`, và `speak` để đọc lại utterance đã dựng.
 */
function stubSynth(voices: Partial<SpeechSynthesisVoice>[]) {
  const spoken: SpeechSynthesisUtterance[] = []

  vi.stubGlobal('speechSynthesis', {
    getVoices: () => voices as SpeechSynthesisVoice[],
    cancel: vi.fn(),
    speak: (utterance: SpeechSynthesisUtterance) => spoken.push(utterance),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })

  return spoken
}

function voice(name: string, lang: string, localService = true) {
  return { name, lang, localService, default: false, voiceURI: name }
}

beforeEach(() => {
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
      addEventListener() {}
    },
  )
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
