import { vi } from 'vitest'

/**
 * Giả lập `speechSynthesis` cho jsdom.
 *
 * jsdom KHÔNG có Web Speech API. Không giả lập thì mọi nút phát âm đều rơi vào
 * `unsupported` và mọi bài kiểm tra về giọng đọc đều xanh một cách vô nghĩa.
 *
 * Nằm chung ở đây vì ba bộ test cùng cần: `lib/audio.test.ts` (thuật toán chọn
 * giọng), `features/settings/voice-settings.test.tsx` (màn cài đặt) và
 * `features/dictionary/audio-buttons.test.tsx` (trạng thái nút trên trang thật).
 */

/** Một giọng tối thiểu, đúng những trường `audio.ts` đọc tới. */
export function voice(name: string, lang: string, localService = true) {
  return { name, lang, localService, default: false, voiceURI: name }
}

/**
 * Cài `speechSynthesis` giả và trả về mảng utterance đã phát.
 *
 * Mảng trả về là cách duy nhất khẳng định GIỌNG NÀO thực sự được dùng — thứ
 * không nghe được trong jsdom.
 */
export function stubSynth(voices: Partial<SpeechSynthesisVoice>[]) {
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

/**
 * Cài `SpeechSynthesisUtterance` giả.
 *
 * Cố tình KHÔNG bắn `end`: câu ở trạng thái đang đọc suốt bài kiểm tra, nên
 * test khẳng định được nút nào đang sáng.
 */
export function stubUtterance(): void {
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
}
