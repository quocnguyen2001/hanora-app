import { useEffect, useState } from 'react'

/**
 * Trạng thái kết nối.
 *
 * `navigator.onLine` chỉ nói "có giao diện mạng", không nói "tới được server" —
 * nó `true` khi cắm wifi không có internet. Nó đủ dùng để hiện banner, nhưng
 * KHÔNG được dùng làm căn cứ chặn thao tác: chỗ đó dựa vào lỗi mạng thật từ
 * `lib/api.ts`.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    function update() {
      setOnline(navigator.onLine)
    }

    window.addEventListener('online', update)
    window.addEventListener('offline', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return online
}
