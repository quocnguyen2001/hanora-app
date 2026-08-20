import type { ReactNode } from 'react'

/**
 * Khung cho các màn xác thực.
 *
 * Giữ phong cách calm của design system — KHÔNG dựng form kiểu dashboard: một
 * tiêu đề ấm, một câu phụ, rồi tới form. Đây là màn đầu tiên người dùng thấy.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center gap-6 py-10">
      <header className="space-y-1 text-center">
        <h1 className="text-text-primary text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-body text-text-secondary">{subtitle}</p>}
      </header>

      {children}
    </div>
  )
}
