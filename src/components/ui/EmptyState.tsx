import type { ReactNode } from 'react'

/**
 * Màn trống.
 *
 * `ux-rules.md` gọi tên rất cụ thể: ấm áp và khích lệ, không phải một dòng
 * "Không có dữ liệu". Người dùng mở kho từ lần đầu thấy màn này — nó là lời
 * chào, không phải báo lỗi.
 */
export function EmptyState({
  title,
  description,
  illustration,
  action,
}: {
  title: string
  description?: string
  illustration?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {illustration}
      <h2 className="text-section text-text-primary">{title}</h2>
      {description && <p className="text-body text-text-secondary max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
