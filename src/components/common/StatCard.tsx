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
    <Card className="flex items-center gap-3">
      {icon && <span className="text-primary">{icon}</span>}
      <div>
        <p className="text-caption text-text-secondary">{label}</p>
        <p className="text-section text-text-primary">
          {value}
          {suffix && <span className="text-body text-text-secondary">{suffix}</span>}
        </p>
      </div>
    </Card>
  )
}
