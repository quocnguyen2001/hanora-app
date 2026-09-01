import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { parseMeasureWords } from '@/features/dictionary/api'
import type { WordSummary } from '@/types/dictionary'
import { WordDetailHero } from './WordDetailHero'

const word: WordSummary = {
  id: 1,
  simplified: '银行',
  traditional: '銀行',
  pinyin: 'yínháng',
  han_viet: 'ngân hàng',
  definitions_en: ['bank'],
  definitions_vi: ['ngân hàng'],
  measure_words: [],
  hsk_level: 3,
}

function renderHero(measureWords: WordSummary['measure_words']) {
  return render(
    <WordDetailHero
      word={{ ...word, measure_words: measureWords }}
      // Placeholder thay cho khối ảnh: mặc định hero TỰ gọi API ảnh theo id, và
      // test này không nên xếp một job Pixabay thật.
      illustration={<div />}
    />,
  )
}

describe('lượng từ trong hero', () => {
  it('hiện chữ Hán kèm pinyin, ngăn nhau bằng dấu chấm giữa', () => {
    renderHero([
      { simplified: '家', traditional: '家', pinyin: 'jiā' },
      { simplified: '个', traditional: '個', pinyin: 'gè' },
    ])

    const line = screen.getByText(/Lượng từ/)

    expect(line).toHaveTextContent('家 jiā')
    expect(line).toHaveTextContent('个 gè')
  })

  it('ẩn HẲN dòng khi không có lượng từ', () => {
    // Ca THƯỜNG GẶP, không phải ngoại lệ: chỉ 1.554 / 123.646 mục có lượng từ.
    // Không khung trống, không nhãn "chưa có" — quy ước `han_viet: null`.
    renderHero([])

    expect(screen.queryByText(/Lượng từ/)).not.toBeInTheDocument()
  })
})

describe('parseMeasureWords', () => {
  it('coi trường vắng như danh sách rỗng', () => {
    // Ca CHẮC CHẮN xảy ra, không phải phòng xa: `/words/{id}` nằm trong bucket
    // service worker sống 30 ngày, nên người dùng cũ nhận lại bản không có
    // trường này. Kiểu khai là mảng, nên `undefined` lọt qua sẽ làm `.length`
    // ném ngay giữa hero.
    expect(parseMeasureWords(undefined)).toEqual([])
    expect(parseMeasureWords(null)).toEqual([])
  })

  it('bỏ mục hỏng mà không mất cả danh sách', () => {
    expect(parseMeasureWords([{ pinyin: 'jiā' }, { simplified: '个', pinyin: 'gè' }])).toEqual([
      { simplified: '个', traditional: '个', pinyin: 'gè' },
    ])
  })

  it('rơi về giản thể khi thiếu phồn thể', () => {
    // Đúng quy ước mà chính CC-CEDICT dùng khi hai dạng trùng nhau.
    expect(parseMeasureWords([{ simplified: '家', pinyin: 'jiā' }])).toEqual([
      { simplified: '家', traditional: '家', pinyin: 'jiā' },
    ])
  })
})
