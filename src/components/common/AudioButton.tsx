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
  name,
}: {
  state?: AudioState
  onPlay?: () => void
  size?: 'sm' | 'md'
  /**
   * Đối tượng của nút, gắn thêm vào nhãn.
   *
   * Cần khi một màn có nhiều nút loa KHÁC ĐỐI TƯỢNG nhau — màn Giọng đọc có một
   * nút cho mỗi giọng, và mười lăm nút cùng tên "Phát âm" thì người dùng screen
   * reader nghe xong vẫn không biết mình đang nghe thử giọng nào.
   *
   * Trang chi tiết từ thì KHÔNG cần: ở đó các nút đứng ngay cạnh nội dung của
   * chính nó, ngữ cảnh đã đủ.
   */
  name?: string
}) {
  const base = {
    idle: 'Phát âm',
    playing: 'Đang phát',
    unsupported: 'Thiết bị không hỗ trợ phát âm tiếng Trung',
  }[state]

  // Trạng thái không hỗ trợ giữ nguyên câu giải thích — dán thêm tên giọng vào
  // một lời từ chối chỉ làm nó khó đọc hơn.
  const label = name && state !== 'unsupported' ? `${base} ${name}` : base

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
