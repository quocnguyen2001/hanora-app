import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CharacterBreakdown } from '@/types/dictionary'
import { CharacterAttributes } from './components/CharacterAttributes'

/** `剑` với dữ liệu THẬT từ `dictionary_characters` — khớp ảnh demo. */
const full: CharacterBreakdown = {
  char: '剑',
  pinyin: 'jiàn',
  han_viet: 'kiếm',
  radical: '刂',
  radical_han_viet: 'đao',
  stroke_count: 9,
  decomposition: '⿰佥刂',
  etymology_type: 'pictophonetic',
  stroke_names: ['丿', '丶', '一', '丶', '丶', '丿', '㇀', '丨', '亅'],
}

/**
 * Hình dạng response CŨ trong cache service worker.
 *
 * Không phải ca giả định: `/words/{id}` sống 30 ngày ở bucket
 * `hanora-dictionary-words`, nên mọi người dùng đã mở một từ trước khi sáu
 * trường này tồn tại sẽ nhận lại đúng object này.
 */
const bare: CharacterBreakdown = {
  char: '剑',
  pinyin: 'jiàn',
  han_viet: 'kiếm',
  radical: null,
  radical_han_viet: null,
  stroke_count: null,
  decomposition: null,
  etymology_type: null,
  stroke_names: null,
}

describe('thuộc tính Hán tự', () => {
  it('hiện đủ sáu dòng khi có đủ dữ liệu', () => {
    render(<CharacterAttributes character={full} />)

    expect(screen.getByText('Bính âm:')).toBeInTheDocument()
    expect(screen.getByText('Hình thái:')).toBeInTheDocument()
    expect(screen.getByText('⿰佥刂')).toBeInTheDocument()
    expect(screen.getByText('hình thanh')).toBeInTheDocument()
    expect(screen.getByText('đao')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText('丿 丶 一 丶 丶 丿 ㇀ 丨 亅')).toBeInTheDocument()
  })

  it('ánh xạ lục thư sang tiếng Việt, không hiện chuỗi tiếng Anh', () => {
    render(<CharacterAttributes character={{ ...full, etymology_type: 'ideographic' }} />)

    expect(screen.getByText('chỉ sự')).toBeInTheDocument()
    expect(screen.queryByText('ideographic')).not.toBeInTheDocument()
  })

  it('ẨN dòng lục thư khi giá trị không có trong bảng ánh xạ', () => {
    // Nguồn chỉ có ba loại. Loại thứ tư xuất hiện thì ẩn dòng — một dòng
    // "Lục thư: loangraph" tệ hơn hẳn không có dòng nào.
    render(<CharacterAttributes character={{ ...full, etymology_type: 'loangraph' }} />)

    expect(screen.queryByText('Lục thư:')).not.toBeInTheDocument()
    expect(screen.queryByText('loangraph')).not.toBeInTheDocument()
  })

  it('mỗi dòng tự ẩn khi thiếu, không nhãn trống', () => {
    render(
      <CharacterAttributes
        character={{ ...full, decomposition: null, stroke_names: null, etymology_type: null }}
      />,
    )

    expect(screen.queryByText('Hình thái:')).not.toBeInTheDocument()
    expect(screen.queryByText('Nét bút:')).not.toBeInTheDocument()
    expect(screen.queryByText('Lục thư:')).not.toBeInTheDocument()
    // Ba dòng còn lại nguyên vẹn.
    expect(screen.getByText('Bộ:')).toBeInTheDocument()
    expect(screen.getByText('Số nét:')).toBeInTheDocument()
  })

  it('hiện bộ thủ mà không có âm khi corpus không tra ra', () => {
    // 51/295 bộ không tra được âm. Thà thiếu âm còn hơn đoán.
    render(<CharacterAttributes character={{ ...full, radical_han_viet: null }} />)

    expect(screen.getByText('Bộ:')).toBeInTheDocument()
    expect(screen.getByText('刂')).toBeInTheDocument()
    expect(screen.queryByText('đao')).not.toBeInTheDocument()
  })

  it('vẫn render với response CŨ trong cache — chỉ còn bính âm và Hán-Việt', () => {
    // Ca chắc chắn xảy ra trong tối đa 30 ngày sau khi deploy. Thiếu chốt này
    // thì thẻ Hán tự vỡ cho mọi người dùng hiện có.
    render(<CharacterAttributes character={bare} />)

    expect(screen.getByText('Bính âm:')).toBeInTheDocument()
    expect(screen.getByText('jiàn')).toBeInTheDocument()
    expect(screen.getByText('kiếm')).toBeInTheDocument()
    for (const label of ['Hình thái:', 'Lục thư:', 'Bộ:', 'Số nét:', 'Nét bút:']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it('hiện dòng Bộ mà không có Số nét khi chỉ có một trong hai', () => {
    render(<CharacterAttributes character={{ ...full, stroke_count: null }} />)

    expect(screen.getByText('Bộ:')).toBeInTheDocument()
    expect(screen.queryByText('Số nét:')).not.toBeInTheDocument()
  })
})
