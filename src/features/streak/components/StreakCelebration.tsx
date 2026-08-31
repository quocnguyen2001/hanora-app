import { Link } from 'react-router'
import { FlameIcon } from '@/components/icons'

/**
 * Một dòng chúc mừng khi lượt vừa rồi làm chuỗi tăng.
 *
 * Nhận `current` qua prop, KHÔNG tự đọc `useStreak()`: con số đã nằm sẵn trong
 * response mà người gọi vừa nhận. Hỏi lại bằng một query observer thứ hai vừa
 * thừa một request (query có thể stale lúc màn tổng kết mount), vừa mở ra cửa sổ
 * để lời chúc mừng nói một số khác với chip ngay bên trên nó.
 *
 * Hiệu ứng bằng `animate-rise` có sẵn, KHÔNG kéo `motion` vào: bundle chính đã
 * cố ý loại thư viện đó (+40.9 kB gzip), và block reduced-motion trong `app.css`
 * đã ép mọi animation CSS về 0.01ms nên không cần xử lý riêng.
 */
export function StreakCelebration({ current }: { current?: number }) {
  return (
    <Link
      to="/streak"
      className="border-primary-soft bg-primary-pale rounded-card text-primary flex items-center gap-3 border p-4"
    >
      <FlameIcon size={24} filled />
      <p className="text-body">
        {current === undefined
          ? 'Đã giữ được chuỗi hôm nay.'
          : current === 1
            ? 'Bắt đầu chuỗi mới. Ngày đầu tiên!'
            : `Chuỗi ${current} ngày. Giữ tiếp nhé.`}
      </p>
    </Link>
  )
}
