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

/*
 * Ưu tiên giọng NỮ, giọng chuẩn phổ thông, giọng cài sẵn trên máy.
 *
 * Lấy `voices.find(...)` đầu tiên khớp `zh` là bốc ngẫu nhiên theo thứ tự trình
 * duyệt trả về, và trên nhiều máy cái đầu tiên là giọng nam hoặc giọng máy móc.
 * Cho điểm rồi chọn cao nhất thì kết quả ổn định và có chủ đích.
 *
 * Khớp theo TÊN giọng vì `SpeechSynthesisVoice` không có trường giới tính —
 * đây là dữ liệu duy nhất trình duyệt cho biết. Tên không khớp danh sách nào
 * vẫn dùng được, chỉ là không được cộng điểm.
 */
const FEMALE_VOICE_HINTS = [
  'tingting',
  'ting-ting',
  'meijia',
  'mei-jia',
  'sinji',
  'huihui',
  'yaoyao',
  'xiaoxiao',
  'xiaoyi',
  'xiaobei',
  'xiaoni',
  'hsiaochen',
  'hsiao-chen',
  'hanhan',
  'yanjing',
  'female',
  '女',
]

/** Giọng nam đã biết — trừ điểm, đừng để chúng thắng chỉ vì đứng đầu danh sách. */
const MALE_VOICE_HINTS = [
  'kangkang',
  'yunxi',
  'yunye',
  'yunjian',
  'yunyang',
  'yunfeng',
  'yunhao',
  'zhiwei',
  'liang',
  'male',
  '男',
]

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase().replace('_', '-')
  let score = 0

  if (FEMALE_VOICE_HINTS.some((hint) => name.includes(hint))) score += 6
  if (MALE_VOICE_HINTS.some((hint) => name.includes(hint))) score -= 6

  // Phổ thông đại lục là thứ người học nhắm tới; Đài/Hồng Kông đọc khác đủ để
  // gây nhầm, nên chỉ dùng khi không còn lựa chọn nào.
  if (lang === 'zh-cn' || lang === 'zh') score += 3

  // Giọng cài sẵn phát ngay; giọng mạng có độ trễ và chết khi ngoại tuyến.
  if (voice.localService) score += 1

  return score
}

function findChineseVoice(): SpeechSynthesisVoice | null {
  const chinese = (synth()?.getVoices() ?? []).filter((voice) =>
    voice.lang.toLowerCase().startsWith(LANG_PREFIX),
  )

  if (chinese.length === 0) return null

  return chinese.reduce((best, voice) => (scoreVoice(voice) > scoreVoice(best) ? voice : best))
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
  // Cao hơn mặc định một chút cho giọng sáng, mềm. Trên 1.3 thì bắt đầu méo
  // thành giọng hoạt hình và thanh điệu khó nghe ra.
  utterance.pitch = 1.2

  utterance.addEventListener('end', () => onEnd?.())
  utterance.addEventListener('error', () => onEnd?.())

  speech.speak(utterance)

  return true
}

export function stop(): void {
  synth()?.cancel()
}
