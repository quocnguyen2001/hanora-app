/**
 * Phát âm tiếng Trung bằng Web Speech API.
 *
 * R4: KHÔNG đảm bảo có giọng `zh-CN` trên mọi thiết bị — iOS Safari đặc biệt
 * kén. Khi không có giọng, service báo `unsupported` và `AudioButton` chuyển
 * sang disabled kèm nhãn giải thích. Không bao giờ để nút chết bấm vào không có
 * gì xảy ra.
 */
export type SpeechState = 'idle' | 'playing' | 'unsupported'

const LANG_PREFIX = 'zh'

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null
}

function findChineseVoice(): SpeechSynthesisVoice | null {
  const voices = synth()?.getVoices() ?? []

  return voices.find((voice) => voice.lang.toLowerCase().startsWith(LANG_PREFIX)) ?? null
}

/**
 * `getVoices()` trả rỗng ở lần gọi ĐẦU trên một số trình duyệt — danh sách nạp
 * bất đồng bộ. Phải chờ `voiceschanged`, nếu không mọi thiết bị đều bị coi là
 * không hỗ trợ.
 */
export function onVoicesReady(callback: () => void): () => void {
  const speech = synth()

  if (!speech) {
    callback()
    return () => {}
  }

  // Có thể đã sẵn sàng ngay.
  if (speech.getVoices().length > 0) {
    callback()
  }

  speech.addEventListener('voiceschanged', callback)

  return () => speech.removeEventListener('voiceschanged', callback)
}

export function isSupported(): boolean {
  return synth() !== null && findChineseVoice() !== null
}

export function speak(text: string, onEnd?: () => void): boolean {
  const speech = synth()
  const voice = findChineseVoice()

  if (!speech || !voice) return false

  // Dừng câu đang đọc trước khi đọc câu mới: chồng tiếng là trải nghiệm tệ hơn
  // hẳn so với cắt ngang.
  speech.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice.lang
  // Chậm hơn mặc định một chút: người học cần nghe rõ từng âm tiết.
  utterance.rate = 0.85

  utterance.addEventListener('end', () => onEnd?.())
  utterance.addEventListener('error', () => onEnd?.())

  speech.speak(utterance)

  return true
}

export function stop(): void {
  synth()?.cancel()
}
