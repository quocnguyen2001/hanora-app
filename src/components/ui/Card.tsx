import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Bề mặt lớn hơn dùng bo góc lớn hơn. */
  size?: 'default' | 'hero'
  /**
   * Thẻ bấm được nhưng đích bấm KHÔNG phải chính nó.
   *
   * Có ba chỗ như vậy, và cả ba dựng theo cùng một cách vì lý do a11y: một
   * `<button>` hoặc `<Link>` bọc NGOÀI `Card`, hoặc phủ kín BÊN TRONG nó. Cây
   * DOM đó đúng — nó cho screen reader đúng một đích cho mỗi ô — nhưng nó cũng
   * khiến `Card` không nhìn thấy `onClick` nào và tự xếp mình vào loại thẻ tĩnh.
   *
   * Cờ này nói thẳng điều mà `onClick` không nói được. Không suy ra từ
   * `children` được: một thẻ tĩnh có link trong phần chú thích không vì thế mà
   * trở thành một phím bấm.
   */
  interactive?: boolean
}

/**
 * Bề mặt cơ bản.
 *
 * THẺ TĨNH và THẺ BẤM ĐƯỢC trông khác nhau, và khác ở đúng một thứ: độ dày.
 *
 *   tĩnh      — `shadow-card`, gần như phẳng. Nó là giấy đặt trên bàn.
 *   bấm được  — `chunky`, có gờ 4px và lún xuống khi chạm. Nó là phím bấm.
 *
 * Đây là bản mở rộng của luật đã có từ trước ("chỉ thẻ bấm được mới phản hồi
 * chạm"), không phải luật mới: thẻ tĩnh mà trông dày là mời người dùng bấm vào
 * một thứ không làm gì.
 *
 * HAI class KHÔNG BAO GIỜ cùng lúc — cả hai đều đặt `box-shadow`, nên đứng cùng
 * nhau thì cái nào thắng phụ thuộc thứ tự trong file CSS xuất ra chứ không phụ
 * thuộc thứ tự viết ở đây. Nhánh ba ngôi bên dưới là cách làm điều đó thành bất
 * khả thi thay vì chỉ là quy ước.
 */
export function Card({
  children,
  size = 'default',
  interactive = false,
  className,
  ...props
}: CardProps) {
  const pressable = interactive || Boolean(props.onClick)

  return (
    <div
      className={cn(
        'bg-surface',
        size === 'hero' ? 'rounded-hero p-6' : 'rounded-card p-4',
        pressable ? 'chunky chunky-neutral cursor-pointer' : 'shadow-card',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
