import { useCallback, useEffect, useState } from 'react'
import type { AudioState } from '@/components/common/AudioButton'
import { isSupported, onVoicesReady, speak, stop } from '@/lib/audio'

/**
 * Trạng thái phát âm cho một component.
 *
 * Bắt đầu ở `unsupported` rồi nâng lên `idle` khi biết chắc có giọng — an toàn
 * hơn chiều ngược lại: thà nút mờ trong 100ms đầu còn hơn cho bấm rồi không
 * phát ra gì.
 */
export function useSpeech(): { state: AudioState; play: (text: string) => void } {
  const [supported, setSupported] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const detach = onVoicesReady(() => setSupported(isSupported()))

    return () => {
      detach()
      stop()
    }
  }, [])

  const play = useCallback((text: string) => {
    setPlaying(true)

    const started = speak(text, () => setPlaying(false))

    if (!started) setPlaying(false)
  }, [])

  const state: AudioState = !supported ? 'unsupported' : playing ? 'playing' : 'idle'

  return { state, play }
}
