import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/Button'

/**
 * Thanh báo có bản mới.
 *
 * `registerType: 'prompt'` chứ không phải `autoUpdate`: tự tải lại giữa lúc
 * người dùng đang làm một phiên ôn sẽ mất tiến độ của phiên đó. Người dùng chọn
 * thời điểm.
 *
 * Không có thanh này thì người dùng kẹt ở service worker cũ vô thời hạn — bản
 * vá sẽ không bao giờ tới họ.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="border-border bg-primary-soft sticky top-0 z-20 flex items-center justify-between gap-3 border-b px-4 py-2"
    >
      <span className="text-caption text-text-primary">Đã có phiên bản mới.</span>
      <Button size="sm" onClick={() => void updateServiceWorker(true)}>
        Tải lại
      </Button>
    </div>
  )
}
