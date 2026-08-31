import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SegmentedItem<T extends string> {
  value: T
  label: string
  /** Chữ phụ dưới nhãn — ví dụ "0 KB" ở lựa chọn font hệ thống. */
  hint?: string
  icon?: ReactNode
  /** Class thêm cho riêng nút này — dùng để nút tự render bằng chính font/màu nó đại diện. */
  previewClassName?: string
}

/**
 * Nhóm lựa chọn loại trừ nhau, dùng cho cài đặt.
 *
 * KHÔNG tái dùng `Tabs` dù trông gần giống. `Tabs` là `role="tablist"`, và vai
 * trò đó có nghĩa cụ thể với screen reader: "các panel nội dung, chọn cái nào
 * để xem". Một nhóm cài đặt không chuyển panel nào cả — người dùng sẽ nghe
 * "tab" rồi chờ màn hình đổi. Đúng vai trò ở đây là `radiogroup`.
 *
 * Khác biệt thứ hai, quan trọng với bàn phím: trong `radiogroup` chỉ có MỘT
 * điểm dừng Tab, và các phím mũi tên di chuyển giữa lựa chọn. Đó là lý do
 * `tabIndex` bên dưới chỉ mở cho mục đang chọn — nếu để mọi nút cùng nhận Tab
 * thì người dùng bàn phím phải Tab qua cả 4 tông chữ mới ra khỏi nhóm.
 */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  columns = 'auto',
  className,
}: {
  items: readonly SegmentedItem<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  /** `even` chia đều các cột — dùng khi nhãn dài ngắn khác nhau nhiều. */
  columns?: 'auto' | 'even'
  className?: string
}) {
  function moveFocus(direction: 1 | -1) {
    const index = items.findIndex((item) => item.value === value)

    if (index < 0) return

    // Vòng lại đầu/cuối: mũi tên trong radiogroup không được đi vào ngõ cụt.
    const next = items[(index + direction + items.length) % items.length]

    if (next) onChange(next.value)
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex gap-2', columns === 'even' && 'w-full', className)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault()
          moveFocus(1)
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault()
          moveFocus(-1)
        }
      }}
    >
      {items.map((item) => {
        const selected = item.value === value

        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              'text-body rounded-control-lg min-h-11 px-3 py-2 font-bold',
              'flex flex-col items-center justify-center gap-1',
              'chunky border',
              columns === 'even' ? 'flex-1' : 'shrink-0',
              selected
                ? 'border-primary bg-primary-soft text-primary chunky-primary'
                : 'border-border bg-surface text-text-secondary hover:bg-primary-pale chunky-neutral',
              item.previewClassName,
            )}
          >
            {item.icon && <span aria-hidden>{item.icon}</span>}
            <span>{item.label}</span>
            {item.hint && <span className="text-caption font-normal opacity-70">{item.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}
