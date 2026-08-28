import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HandwritingPad } from './components/HandwritingPad'

vi.mock('@/lib/handwriting', () => ({ recognise: vi.fn(() => Promise.resolve([])) }))

/**
 * jsdom không cài đặt hai thứ mà bảng vẽ dùng thật trên trình duyệt.
 *
 * `getBoundingClientRect` trả về toàn số 0 nên tọa độ sẽ ra `NaN` — đủ để lọt
 * qua nhưng vô nghĩa; gán kích thước thật để test nói được về tọa độ.
 * `setPointerCapture` thì hoàn toàn không tồn tại và sẽ ném.
 */
beforeEach(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, width: 260, height: 260, right: 260, bottom: 260 }),
  })
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn()
})

describe('bảng vẽ chữ Hán', () => {
  /*
   * Hồi quy: `pointFrom(event)` từng được gọi BÊN TRONG updater của
   * `setStrokes`. React chạy updater lúc render, sau khi đã đặt
   * `event.currentTarget` về `null`, nên nét vẽ đầu tiên làm sập cả trang với
   * `Cannot read properties of null (reading 'getBoundingClientRect')`.
   */
  it('vẽ một nét không làm sập component', () => {
    render(<HandwritingPad onPick={vi.fn()} />)

    const canvas = screen.getByLabelText('Bảng vẽ chữ Hán')

    expect(() => {
      fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 })
      fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 40, clientY: 60 })
      fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 90, clientY: 120 })
      fireEvent.pointerUp(canvas, { pointerId: 1 })
    }).not.toThrow()

    // Đã có nét thì hai nút xóa mở khóa — bằng chứng state nhận được tọa độ.
    expect(screen.getByRole('button', { name: 'Xóa hết' })).toBeEnabled()
  })

  it('xóa hết đưa bảng về trạng thái trống', () => {
    render(<HandwritingPad onPick={vi.fn()} />)

    const canvas = screen.getByLabelText('Bảng vẽ chữ Hán')

    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerUp(canvas, { pointerId: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Xóa hết' }))

    expect(screen.getByRole('button', { name: 'Xóa hết' })).toBeDisabled()
  })
})
