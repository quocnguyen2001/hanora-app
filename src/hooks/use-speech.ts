import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioState } from '@/components/common/AudioButton'
import { isSupported, onVoicesReady, speak, stop } from '@/lib/audio'
import { useVoice } from '@/stores/voice'

/**
 * Trạng thái phát âm cho một component.
 *
 * Bắt đầu ở `unsupported` rồi nâng lên `idle` khi biết chắc có giọng — an toàn
 * hơn chiều ngược lại: thà nút mờ trong 100ms đầu còn hơn cho bấm rồi không
 * phát ra gì.
 *
 * Một màn có NHIỀU nút (chi tiết từ: hero + từng Hán tự + từng câu ví dụ) dùng
 * chung một hook, nên trạng thái phải nhớ ĐANG ĐỌC CÁI NÀO. Một cờ `playing`
 * dùng chung sẽ làm cả loạt nút cùng sáng khi chỉ một câu đang được đọc.
 *
 * Giọng người dùng chọn đọc bằng `useVoice.getState()` tại thời điểm BẤM, không
 * phải bằng cách subscribe store. Hai lý do:
 *
 * - Giá trị đọc ra luôn là mới nhất, nên đổi giọng ở màn cài đặt có hiệu lực
 *   ngay ở mọi màn khác mà không cần tải lại.
 * - Đổi giọng không làm re-render các màn có nút loa. Trang chi tiết từ có hàng
 *   chục `AudioButton` và không có gì trong giao diện của chúng phụ thuộc giọng.
 */
export function useSpeech(): {
  state: AudioState
  stateFor: (key: string) => AudioState
  play: (text: string, key?: string, voiceOverride?: string | null) => void
} {
  const [supported, setSupported] = useState(false)
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  /*
   * Mỗi lượt phát có một số thứ tự riêng. `speak` gọi `cancel()` trước, và lượt
   * bị cắt vẫn bắn `end`/`error` — không có số thứ tự thì cái kết thúc muộn đó
   * sẽ tắt trạng thái của lượt vừa mới bắt đầu.
   */
  const turn = useRef(0)

  useEffect(() => {
    const detach = onVoicesReady(() => setSupported(isSupported()))

    return () => {
      detach()
      stop()
    }
  }, [])

  const play = useCallback((text: string, key = text, voiceOverride?: string | null) => {
    /*
     * `undefined` = dùng giọng đã lưu. `null` = ép về Tự động (chấm điểm).
     *
     * Phân biệt hai cái này là có chủ đích: màn cài đặt cần nghe thử hàng "Tự
     * động" NGAY CẢ KHI người dùng đang lưu một giọng khác. Gộp chúng lại thì
     * hàng đó sẽ phát bằng giọng đang chọn và người dùng không so được gì.
     */
    const voiceURI = voiceOverride === undefined ? useVoice.getState().voiceURI : voiceOverride

    turn.current += 1
    const current = turn.current

    setPlayingKey(key)

    const finish = () => {
      if (turn.current === current) setPlayingKey(null)
    }

    const started = speak(text, { voiceURI, onEnd: finish })

    if (!started) finish()
  }, [])

  const stateFor = useCallback(
    (key: string): AudioState => {
      if (!supported) return 'unsupported'

      return playingKey === key ? 'playing' : 'idle'
    },
    [supported, playingKey],
  )

  // Màn chỉ có MỘT nút không cần khoá: bất kỳ thứ gì đang đọc cũng là của nút đó.
  const state: AudioState = !supported ? 'unsupported' : playingKey !== null ? 'playing' : 'idle'

  return { state, stateFor, play }
}
