import { SpeakerIcon } from '@/components/icons'
import { IconButton } from '@/components/ui/IconButton'

export type AudioState = 'idle' | 'playing' | 'unsupported'

/**
 * Nút phát âm.
 *
 * `unsupported` là trạng thái hạng nhất, không phải trường hợp bên lề: Web
 * Speech API không đảm bảo có giọng `zh-CN` trên mọi thiết bị, iOS Safari đặc
 * biệt kén (R4). Khi không có giọng thì nút bị disable kèm nhãn nói rõ lý do —
 * KHÔNG để nút chết bấm vào không có gì xảy ra.
 */
export function AudioButton({
  state = 'idle',
  onPlay,
  size = 'md',
}: {
  state?: AudioState
  onPlay?: () => void
  size?: 'sm' | 'md'
}) {
  const label = {
    idle: 'Phát âm',
    playing: 'Đang phát',
    unsupported: 'Thiết bị không hỗ trợ phát âm tiếng Trung',
  }[state]

  return (
    <IconButton
      label={label}
      icon={<SpeakerIcon size={size === 'md' ? 22 : 20} />}
      variant={state === 'playing' ? 'primary' : 'soft'}
      size={size}
      disabled={state === 'unsupported'}
      onClick={onPlay}
    />
  )
}
