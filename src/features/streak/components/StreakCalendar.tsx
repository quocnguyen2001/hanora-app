import { cn } from '@/lib/cn'
import type { StreakDay } from '../api'

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function formatDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)

  return `${parsed.getDate()}/${parsed.getMonth() + 1}`
}

/**
 * Lịch 30 ngày gần nhất, ô đạt được tô đậm.
 *
 * MÀU KHÔNG PHẢI THÔNG TIN DUY NHẤT: mỗi ô có `aria-label` nói rõ ngày và
 * trạng thái, và ô đạt còn khác cả nền lẫn độ đậm chữ. Người không phân biệt
 * được hai tông hồng vẫn đọc được lịch của mình.
 */
export function StreakCalendar({ days }: { days: StreakDay[] }) {
  return (
    // Chặn bề ngang: `grid-cols-7` + `aspect-square` trong `main` rộng 1200px
    // trên desktop cho ra 30 ô vuông ~155px, mỗi ô chứa một con số 15px.
    <div className="max-w-sm">
      <div className="text-caption text-text-secondary mb-2 grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      {/*
        `<ul>` chứ không phải một mớ `<div>`: đây là một DANH SÁCH ngày, và
        screen reader thông báo được số phần tử.
      */}
      <ul className="grid grid-cols-7 gap-1.5" style={{ gridAutoFlow: 'row' }}>
        {days.map((day, index) => (
          <li
            key={day.date}
            // Ô đầu tiên đẩy sang đúng thứ trong tuần của nó; các ô sau tự chảy.
            style={
              index === 0
                ? { gridColumnStart: new Date(`${day.date}T00:00:00`).getDay() + 1 }
                : undefined
            }
          >
            <span
              /*
                `role="img"` là bắt buộc, không phải trang trí: `aria-label` không
                hợp lệ trên một `<span>` role generic và NVDA/JAWS bỏ qua nó. Thiếu
                dòng này thì screen reader đọc "danh sách 30 mục: 2, 3, 4…" —
                không ngày, không trạng thái.
              */
              role="img"
              aria-label={`${formatDay(day.date)}: ${day.met ? 'đã đạt' : 'chưa đạt'}`}
              className={cn(
                'rounded-control text-caption flex aspect-square items-center justify-center',
                day.met
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'bg-border text-text-secondary',
              )}
            >
              {formatDay(day.date).split('/')[0]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
