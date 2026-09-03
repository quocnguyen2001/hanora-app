import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'

/**
 * Thẻ số liệu. Hoãn từ P3 sang đây — nơi dùng đầu tiên.
 *
 * Nhãn luôn đi cùng con số: một con số lớn không có nhãn thì đọc bằng screen
 * reader chỉ ra "85", không nói được 85 cái gì.
 */
export function StatCard({
  label,
  value,
  suffix,
  icon,
}: {
  label: string
  value: number | string
  suffix?: string
  icon?: ReactNode
}) {
  return (
    /*
     * XẾP DỌC, không phải icon nằm cạnh chữ.
     *
     * Ba thẻ này nằm trong lưới `grid-cols-3` ở màn Thống kê. Trên máy 360px,
     * mỗi cột rộng ~101px; trừ `p-4` còn 69px, trừ icon 20px và `gap-3` 12px thì
     * nhãn chỉ còn 37px. "Chuỗi ngày" ở cỡ 12px cần ~58px, nên nó XUỐNG DÒNG
     * giữa chừng — và ba thẻ cạnh nhau ngắt dòng ở ba chỗ khác nhau làm hàng số
     * liệu mất hẳn đường ngang chung.
     *
     * Xếp dọc trả lại trọn 69px cho nhãn. Nó cũng chịu được trục cỡ chữ: người
     * dùng chọn cỡ lớn thì nhãn giãn theo chiều rộng có sẵn thay vì tranh chỗ
     * với icon.
     */
    <Card className="flex flex-col gap-1">
      {/*
        Icon ngồi trên một đĩa tint, cùng mô-típ với mark thương hiệu ở header
        và hàng cài đặt ở màn Tài khoản.

        Một icon nét mảnh tô màu chủ đạo, đứng trần trên nền trắng, gần như biến
        mất giữa hai dòng chữ — nó không đủ diện tích để đọc ra là màu gì. Đĩa
        `primary-soft` nâng diện tích màu lên mà không phải phóng to icon, và vì
        nó lặp lại ở ba chỗ nên nó đọc thành một mô-típ chứ không phải trang trí
        rời rạc.
      */}
      {icon && (
        <span className="bg-primary-soft text-primary flex size-9 items-center justify-center rounded-full">
          {icon}
        </span>
      )}
      <p className="text-caption text-text-secondary">{label}</p>
      <p className="text-section text-text-primary">
        {value}
        {suffix && <span className="text-body text-text-secondary">{suffix}</span>}
      </p>
    </Card>
  )
}
