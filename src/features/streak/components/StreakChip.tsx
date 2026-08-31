import { Link } from 'react-router'
import { FlameIcon } from '@/components/icons'
import { cn } from '@/lib/cn'
import { useStreakValue } from '../hooks'

/**
 * Chuỗi ngày trên thanh header, hiện ở MỌI màn.
 *
 * ## Hai nguồn số, theo thứ tự
 *
 * `useStreak()` trước; khi nó chưa có gì (đang tải, hoặc lỗi mạng) thì rơi về
 * `useMe()`. Đó không phải phòng xa thừa: `/api/auth/me` được service worker
 * cache (`NetworkFirst`, bucket dữ liệu cá nhân) còn `/api/streak` cố ý
 * `no-store`, nên `/auth/me` là đường DUY NHẤT chip có số khi mở app lúc ngoại
 * tuyến. Số đó có thể cũ tới 7 ngày — vẫn tốt hơn hẳn việc người đang giữ chuỗi
 * 40 ngày mở app và thấy chip biến mất.
 *
 * ## Khi nào ẩn hẳn
 *
 * Không nguồn nào có số, hoặc chuỗi bằng 0. Người mới không cần một số 0 trên
 * header, và một khung xương treo vĩnh viễn ở mọi màn còn tệ hơn.
 *
 * Component này render ở mọi màn nên nó phải THUẦN: không effect, không điều
 * hướng ngầm. Lỗi query thì không render gì.
 */
export function StreakChip() {
  const { current, metToday } = useStreakValue()

  if (current === undefined || current === 0) return null

  const label = metToday
    ? `Chuỗi ${current} ngày, hôm nay đã đạt mục tiêu`
    : `Chuỗi ${current} ngày, hôm nay chưa đạt mục tiêu`

  return (
    <Link
      to="/streak"
      aria-label={label}
      className={cn(
        'rounded-control-lg flex h-11 items-center gap-1 px-2',
        'duration-ui ease-soft transition-colors',
        'hover:bg-primary-pale active:bg-primary-soft',
        // Màu là lớp thứ HAI, không phải lớp duy nhất — ngọn lửa còn đặc/rỗng
        // theo `filled`. "Chưa cháy" phải đọc được là "chuỗi vẫn còn", không
        // phải "chuỗi đã mất", nên số luôn hiện ở cả hai trạng thái.
        metToday ? 'text-primary' : 'text-text-secondary',
      )}
    >
      {/*
        Ngọn lửa thở CHỈ khi hôm nay đã đạt mục tiêu.

        Chuyển động ở đây là phần thưởng, không phải cảnh báo. Cho nó nhấp nháy
        ở trạng thái "chưa đạt" thì người dùng đọc ra là "sắp mất chuỗi rồi" —
        ngược hẳn ý, và cũng ngược với luật đã ghi trong component này rằng
        trạng thái chưa cháy phải đọc được là "chuỗi vẫn còn".

        Người đã tắt hiệu ứng vẫn thấy ngọn lửa ĐẶC — `filled` mới là lớp mang
        nghĩa, chuyển động chỉ là lớp thứ ba sau hình dạng và màu.
      */}
      <span className={cn('flex', metToday && 'animate-flame')}>
        <FlameIcon size={20} filled={metToday} />
      </span>
      <span className="text-body font-bold tabular-nums">{current}</span>
    </Link>
  )
}
