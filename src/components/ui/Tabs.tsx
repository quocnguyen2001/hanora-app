import { cn } from '@/lib/cn'

export interface TabItem {
  value: string
  label: string
}

/**
 * Tab lọc dạng pill, dùng cho cả tab tìm kiếm lẫn 4 tab kho từ.
 *
 * Dùng `role="tablist"` thật với `aria-selected` — một hàng button không có vai
 * trò sẽ khiến screen reader đọc ra bốn nút rời rạc, không nói được cái nào đang
 * chọn.
 */
export function Tabs({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: readonly TabItem[]
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex gap-2 overflow-x-auto pb-1', className)}
    >
      {items.map((item) => {
        const selected = item.value === value

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            className={cn(
              'text-body min-h-11 shrink-0 rounded-full px-4 font-medium transition duration-press ease-soft active:scale-95',
              selected
                ? 'bg-primary text-white'
                : 'bg-primary-pale text-text-secondary hover:bg-primary-soft',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
