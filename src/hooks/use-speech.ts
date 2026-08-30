import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioState } from '@/components/common/AudioButton'
import { isSupported, onVoicesReady, speak, stop } from '@/lib/audio'

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
 */
export function useSpeech(): {
  state: AudioState
  stateFor: (key: string) => AudioState
  play: (text: string, key?: string) => void
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

  const play = useCallback((text: string, key = text) => {
    turn.current += 1
    const current = turn.current

    setPlayingKey(key)

    const finish = () => {
      if (turn.current === current) setPlayingKey(null)
    }

    const started = speak(text, finish)

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
