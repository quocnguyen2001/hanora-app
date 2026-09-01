import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Rào lỗi cho một TÍNH NĂNG PHỤ, không phải cho cả trang.
 *
 * Tồn tại cho những khối được nạp lười và dựa vào thư viện bên thứ ba: chúng
 * hỏng theo hai cách mà `try/catch` bên trong component không với tới được —
 * chunk tải lỗi (mạng chập, deploy mới dọn file cũ) và lỗi ném lúc render.
 *
 * Ranh giới: nó KHÔNG được nuốt lỗi của nội dung chính. Đặt nó quanh một khối
 * mà người dùng vẫn dùng được màn hình khi thiếu — bảng tập viết là đúng loại
 * đó, vì thứ tự nét đã hiện sẵn ở dòng "Nét bút".
 *
 * Class component vì React chưa có hook tương đương; đây là ngoại lệ duy nhất
 * trong codebase và nó có lý do kỹ thuật, không phải thói quen.
 */
export class FeatureErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Ghi ra console chứ không nuốt im: một tính năng phụ chết lặng lẽ là thứ
    // không ai phát hiện cho tới khi có người dùng báo.
    console.error('Khối tính năng phụ lỗi:', error, info.componentStack)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
