import { useOnlineStatus } from '@/hooks/use-online-status'

/**
 * Dải mỏng báo mất mạng.
 *
 * Nói luôn thứ VẪN dùng được, không chỉ thứ đã hỏng — người dùng mở app trên
 * tàu điện cần biết mình còn ôn được kho từ đã lưu hay không.
 */
export function OfflineBanner() {
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-warning/15 text-caption text-text-primary px-4 py-2 text-center"
    >
      Đang ngoại tuyến — bạn vẫn xem được kho từ đã lưu.
    </div>
  )
}
