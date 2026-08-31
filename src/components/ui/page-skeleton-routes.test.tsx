import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageSkeleton } from './PageSkeleton'

/**
 * `PageSkeleton` phân nhánh bằng `startsWith`, và file đó đã ghi lại cái bẫy
 * thứ tự BỐN lần (`/review/history`, `/account/settings/voice`,
 * `/account/settings`, và giờ là `/topics/`). Không có test nào khoá thứ tự đó
 * — đảo hai nhánh là một thay đổi trông vô hại, không làm đỏ gì, và hậu quả
 * chỉ thấy được bằng mắt trong khoảnh khắc chunk đang tải.
 *
 * Khoá bằng SỐ khối skeleton: lưới chủ đề là 8 ô, màn học là một thẻ lớn.
 */
describe('PageSkeleton — thứ tự nhánh route', () => {
  function blocks(pathname: string): number {
    const { container } = render(<PageSkeleton pathname={pathname} />)

    return container.querySelectorAll('[aria-hidden="true"], .animate-pulse').length
  }

  it('màn học thẻ KHÔNG mượn khung xương của lưới', () => {
    // `'/topics/tinh-yeu'.startsWith('/topics')` cũng đúng, nên nhánh `/topics/`
    // phải đứng trước. Đảo thứ tự thì màn học hiện tám ô vuông rồi nhảy sang
    // một thẻ lớn.
    const learn = blocks('/topics/tinh-yeu')
    const grid = blocks('/topics')

    expect(learn).toBeGreaterThan(0)
    expect(grid).toBeGreaterThan(0)
    expect(learn).not.toBe(grid)
  })

  it('lưới chủ đề có nhiều ô hơn màn học', () => {
    expect(blocks('/topics')).toBeGreaterThan(blocks('/topics/tinh-yeu'))
  })

  it('màn chuỗi KHÔNG mượn khung xương của Thống kê', () => {
    // Hai màn khác hình hẳn: Thống kê là biểu đồ + hàng ba thẻ + donut, còn
    // `/streak` là thẻ hai số + thẻ tiến độ + lưới 30 ô. Mượn nhầm tạo ra đúng
    // cú nhảy bố cục mà khung xương theo route sinh ra để tránh.
    expect(blocks('/streak')).toBeGreaterThan(0)
    expect(blocks('/streak')).not.toBe(blocks('/stats'))
  })
})
