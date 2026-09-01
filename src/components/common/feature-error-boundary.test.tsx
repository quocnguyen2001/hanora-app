import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FeatureErrorBoundary } from './FeatureErrorBoundary'

function Boom(): never {
  throw new Error('chunk hỏng')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('FeatureErrorBoundary', () => {
  it('hiện fallback thay vì để lỗi lan ra cả trang', () => {
    // Ca thật nó tồn tại để bắt: chunk lười của bảng tập viết tải hỏng — mạng
    // chập, hoặc deploy mới đã dọn file cũ. Lỗi đó ném ở ranh giới `lazy()`,
    // nơi một `try/catch` bên trong component không với tới.
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <FeatureErrorBoundary fallback={<p>Không mở được bảng tập viết.</p>}>
        <Boom />
      </FeatureErrorBoundary>,
    )

    expect(screen.getByText('Không mở được bảng tập viết.')).toBeInTheDocument()
  })

  it('ghi lỗi ra console chứ không nuốt im', () => {
    // Một tính năng phụ chết lặng lẽ là thứ không ai phát hiện cho tới khi có
    // người dùng báo.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <FeatureErrorBoundary fallback={<p>hỏng</p>}>
        <Boom />
      </FeatureErrorBoundary>,
    )

    expect(spy).toHaveBeenCalled()
  })

  it('không đụng gì khi con render bình thường', () => {
    render(
      <FeatureErrorBoundary fallback={<p>hỏng</p>}>
        <p>nội dung thật</p>
      </FeatureErrorBoundary>,
    )

    expect(screen.getByText('nội dung thật')).toBeInTheDocument()
    expect(screen.queryByText('hỏng')).not.toBeInTheDocument()
  })
})
