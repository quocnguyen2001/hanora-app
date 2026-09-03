import { useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabViewItem {
  value: string
  label: string
  /** Nội dung của tab. Chỉ tab đang chọn được render — xem docstring. */
  panel: ReactNode
}

/**
 * Tab CÓ PANEL — khác `Tabs`, và khác ở chỗ quan trọng nhất.
 *
 * ## Vì sao không tái dùng `Tabs`
 *
 * `Tabs` mang `role="tablist"` nhưng bốn chỗ đang dùng nó (lọc kho từ, chế độ
 * tìm kiếm, khoảng thời gian thống kê, mục gallery) đều là BỘ LỌC: chúng đổi
 * nội dung của một danh sách, không chuyển giữa các panel. Nó cũng thiếu hẳn
 * nửa còn lại của mẫu tab: không `aria-controls`, không `role="tabpanel"`, và
 * MỌI nút đều nhận Tab.
 *
 * Sửa tại chỗ sẽ kéo theo bốn màn không liên quan. Nên đây là component riêng,
 * và nó gói CẢ tablist lẫn panel vào một chỗ — không thể dùng đúng một nửa rồi
 * quên nửa kia.
 *
 * (Việc bốn chỗ kia gắn `role="tablist"` sai ngữ nghĩa là nợ có sẵn, ngoài phạm
 * vi lần này. Đúng vai của chúng là `radiogroup`, như `Segmented` đã ghi.)
 *
 * ## Bàn phím — roving tabindex
 *
 * Trong một tablist chỉ có MỘT điểm dừng Tab; mũi tên di chuyển giữa các tab.
 * Đây không phải chi tiết trang trí: để cả ba tab cùng nhận Tab thì người dùng
 * bàn phím phải Tab qua hết thanh tab mới tới được nội dung, ở MỌI lần đổi tab.
 * Cùng luật mà `Segmented` đang giữ cho nhóm radio.
 *
 * Focus đi kèm lựa chọn (mẫu "automatic activation" của WAI-ARIA APG): mũi tên
 * vừa đổi tab vừa dời focus. Làm được vì mọi NÚT tab luôn có trong DOM — chỉ
 * panel mới thay đổi — nên gọi `focus()` ngay trong handler là an toàn, không
 * cần chờ render.
 *
 * ## Panel: unmount, không phải ẩn bằng CSS
 *
 * Chỉ tab đang chọn được render. Dữ liệu của mọi panel đã fetch ở cấp TRANG nên
 * không có request nào chạy lại; thứ mất đi chỉ là state cục bộ (ví dụ sheet
 * tập viết đang mở). Đổi lại, không có nội dung ẩn nào lọt vào cây a11y hay vào
 * truy vấn của test — đúng thứ `hidden` hay `display:none` hay để lại.
 */
export function TabView({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: readonly TabViewItem[]
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
}) {
  const baseId = useId()
  const listRef = useRef<HTMLDivElement>(null)

  /**
   * Đổi tab và giữ thanh tab trong tầm mắt.
   *
   * Panel ba tab cao rất khác nhau. Người dùng cuộn sâu trong tab "Ví dụ" rồi
   * bấm sang "Nghĩa" — trang co lại, trình duyệt kẹp `scrollY` về mức tối đa
   * mới, và họ rơi xuống một chỗ bất kỳ với thanh tab đã trôi lên trên đầu màn.
   *
   * CHỈ cuộn khi thanh tab thật sự đã ở trên khung nhìn. Cuộn vô điều kiện sẽ
   * giật màn hình của người đang đứng sẵn ở đầu trang — họ không yêu cầu đi đâu
   * cả. Và chỉ gọi từ tương tác của NGƯỜI DÙNG, không từ effect: mở thẳng bằng
   * `?tab=` phải để trang ở đúng đầu như mọi lần tải khác.
   */
  function selectAndReveal(next: string) {
    onChange(next)

    if ((listRef.current?.getBoundingClientRect().top ?? 0) < 0) {
      listRef.current?.scrollIntoView({ block: 'start' })
    }
  }

  /**
   * Đổi tab VÀ dời focus sang nút của tab đó.
   *
   * Tìm nút theo VỊ TRÍ trong danh sách `[role="tab"]`, không phải theo selector
   * dựng từ `value`: `value` là chuỗi do chỗ gọi truyền vào, nên nhét nó vào một
   * selector là mở đường cho ký tự phá cú pháp. Chỉ số thì luôn an toàn.
   */
  function moveTo(index: number) {
    const next = items[index]

    if (!next) return

    selectAndReveal(next.value)
    listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const index = items.findIndex((item) => item.value === active?.value)

    if (index < 0) return

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const step = event.key === 'ArrowRight' ? 1 : -1

      // Vòng lại đầu/cuối: mũi tên trong tablist không được đi vào ngõ cụt.
      moveTo((index + step + items.length) % items.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveTo(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      moveTo(items.length - 1)
    }
  }

  /*
   * MỌI thứ dưới đây suy từ `active`, KHÔNG từ `value` thô.
   *
   * `value` là chuỗi do chỗ gọi truyền vào và có thể không khớp mục nào. Khi đó
   * `active` rơi về mục đầu — nhưng nếu `selected` vẫn so với `value` thì không
   * tab nào được chọn: cả ba nhận `tabIndex={-1}` (bàn phím KHÔNG vào được
   * tablist), không tab nào có `aria-selected="true"` (screen reader đọc ra một
   * tablist không có gì đang chọn), và `onKeyDown` thoát sớm nên mũi tên chết —
   * trong khi panel vẫn hiện. Hỏng im lặng, và `TabView` là primitive dùng
   * chung nên nó sẽ hỏng ở chỗ gọi tiếp theo chứ không phải ở đây.
   */
  const active = items.find((item) => item.value === value) ?? items[0]

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        // `overflow-x-auto` là lưới an toàn, không phải bố cục mong đợi: nhãn
        // được chọn để vừa một hàng ở 360px cỡ chữ 130%. Nếu có ngày phải cuộn
        // ngang thì nhãn đã quá dài, không phải thanh tab quá hẹp.
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {items.map((item) => {
          const selected = item.value === active?.value

          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectAndReveal(item.value)}
              className={cn(
                'text-body duration-press ease-soft min-h-11 shrink-0 rounded-full px-4 font-bold transition active:scale-95',
                selected
                  ? 'bg-primary text-on-primary'
                  : // Hover ĐẬM CHỮ chứ không chỉ đậm nền, và đó là ràng buộc
                    // tương phản chứ không phải thẩm mỹ: `text-text-secondary`
                    // trên `primary-soft` chỉ đạt 4,31:1 ở màu tím và 4,44:1 ở
                    // xanh biển — dưới AA cho chữ 14px, kể cả in đậm.
                    // `text-text-primary` đưa nó lên trên 10:1 ở mọi màu, và
                    // hover đậm dần cả chữ lẫn nền vốn cũng đọc rõ hơn.
                    // `scripts/check-contrast.mjs` gác cặp này.
                    'bg-primary-pale text-text-secondary hover:bg-primary-soft hover:text-text-primary',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {active && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active.value}`}
          aria-labelledby={`${baseId}-tab-${active.value}`}
          /*
           * `tabIndex={0}` để chính panel nhận được focus.
           *
           * Bắt buộc theo APG khi panel có thể KHÔNG chứa phần tử focus được —
           * và ở đây đó là ca thật: tab "Nghĩa" của một từ không có nội dung AI
           * chỉ gồm chữ. Thiếu nó thì người dùng bàn phím bấm mũi tên đổi tab
           * rồi Tab tiếp là nhảy thẳng qua cả panel, không đọc được gì.
           */
          tabIndex={0}
          className="mt-3"
        >
          {active.panel}
        </div>
      )}
    </div>
  )
}
