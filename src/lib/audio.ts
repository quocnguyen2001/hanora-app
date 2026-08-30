/**
 * Phát âm tiếng Trung bằng Web Speech API.
 *
 * R4: KHÔNG đảm bảo có giọng `zh-CN` trên mọi thiết bị — iOS Safari đặc biệt
 * kén. Khi không có giọng, service báo `unsupported` và `AudioButton` chuyển
 * sang disabled kèm nhãn giải thích. Không bao giờ để nút chết bấm vào không có
 * gì xảy ra.
 *
 * Module này KHÔNG import store. Giọng người dùng chọn đi vào qua tham số của
 * `speak()`, không phải qua một state toàn cục — nhờ vậy nó test được chỉ bằng
 * cách stub `speechSynthesis`, và màn cài đặt nghe thử được một giọng KHÁC với
 * giọng đang chọn mà không phải đụng vào store.
 */
export type SpeechState = 'idle' | 'playing' | 'unsupported'

/**
 * Một giọng, ở dạng tầng giao diện cầm được.
 *
 * Không đưa `SpeechSynthesisVoice` thô lên UI: nó là đối tượng của trình duyệt,
 * không serialize được và không stub gọn trong test.
 */
export interface VoiceOption {
  uri: string
  name: string
  lang: string
  /** Giọng cài sẵn trên máy: phát ngay, chạy được cả khi ngoại tuyến. */
  local: boolean
}

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

function chineseVoices(): SpeechSynthesisVoice[] {
  return (synth()?.getVoices() ?? []).filter((voice) =>
    voice.lang.toLowerCase().startsWith(LANG_PREFIX),
  )
}

function bestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null

  return voices.reduce((best, voice) => (scoreVoice(voice) > scoreVoice(best) ? voice : best))
}

/**
 * Mọi giọng `zh-*` thiết bị có, sắp theo điểm giảm dần.
 *
 * Phần tử `[0]` chính là giọng chế độ "Tự động" sẽ chọn — màn cài đặt dựa vào
 * điều đó để nói ra tên giọng đang được dùng thay vì để "Tự động" là hộp đen.
 *
 * `Array.prototype.sort` ổn định theo spec từ ES2019, nên những giọng cùng điểm
 * giữ nguyên thứ tự trình duyệt trả về; danh sách không nhảy giữa hai lần mở màn.
 */
export function listChineseVoices(): VoiceOption[] {
  /*
   * Trùng `voiceURI` là có thật: một engine đăng ký cùng một giọng cho nhiều
   * locale. Không lọc thì màn cài đặt dựng hai hàng cùng khóa — React cảnh báo
   * trùng key, hai radio cùng được đánh dấu chọn, và mũi tên không bao giờ tới
   * được hàng thứ hai. Lọc SAU khi sắp nên bản điểm cao nhất là bản sống sót.
   */
  const seen = new Set<string>()

  return chineseVoices()
    .sort((a, b) => scoreVoice(b) - scoreVoice(a))
    .filter((voice) => {
      if (seen.has(voice.voiceURI)) return false

      seen.add(voice.voiceURI)

      return true
    })
    .map((voice) => ({
      uri: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      local: voice.localService,
    }))
}

/**
 * Giọng ứng với `voiceURI`, hoặc giọng chấm điểm cao nhất.
 *
 * URI không khớp thì rơi về chấm điểm chứ KHÔNG trả `null`: giọng đã lưu biến
 * mất (đổi máy, đổi trình duyệt, iOS gỡ giọng) không phải lý do để nút loa chết.
 * Người dùng nghe thấy đúng thứ họ nghe trước khi có tính năng này.
 */
function resolveVoice(voiceURI?: string | null): SpeechSynthesisVoice | null {
  const voices = chineseVoices()
  const chosen = voiceURI ? voices.find((voice) => voice.voiceURI === voiceURI) : undefined

  return chosen ?? bestVoice(voices)
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
  return synth() !== null && chineseVoices().length > 0
}

export function speak(
  text: string,
  options?: { voiceURI?: string | null; onEnd?: () => void },
): boolean {
  const speech = synth()
  const voice = resolveVoice(options?.voiceURI)

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

  utterance.addEventListener('end', () => options?.onEnd?.())
  utterance.addEventListener('error', () => options?.onEnd?.())

  speech.speak(utterance)

  return true
}

export function stop(): void {
  synth()?.cancel()
}
