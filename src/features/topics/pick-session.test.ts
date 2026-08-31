import { describe, expect, it } from 'vitest'
import type { TopicWord } from './api'
import { pickSession, remainingCount, SLICE_SIZE } from './pick-session'

function word(id: number, rank: number): TopicWord {
  return {
    id,
    simplified: `字${id}`,
    traditional: `字${id}`,
    pinyin: `zi${id}`,
    han_viet: `âm ${id}`,
    definition_vi: `nghĩa ${id}`,
    definition_en: `meaning ${id}`,
    hsk_level: null,
    rank,
  }
}

/** Bỏ xáo trộn để khẳng định được THỨ TỰ, không phải xác suất. */
const noShuffle = <T>(items: T[]) => items

describe('pickSession', () => {
  it('loại từ đã lưu và từ đã bỏ qua', () => {
    const words = [word(1, 1), word(2, 2), word(3, 3)]

    const picked = pickSession({
      words,
      savedIds: new Set([1]),
      skippedIds: new Set([2]),
      shuffle: noShuffle,
    })

    expect(picked.map((w) => w.id)).toEqual([3])
  })

  it('bốc trong lát cắt thông dụng nhất, không bốc đều cả bộ', () => {
    // 100 từ; chỉ 30 từ đầu theo `rank` được vào vòng bốc. Từ rank 31+ (đuôi
    // dài) không bao giờ xuất hiện chừng nào phần đầu chưa học hết.
    const words = Array.from({ length: 100 }, (_, index) => word(index + 1, index + 1))

    const picked = pickSession({
      words,
      savedIds: new Set(),
      skippedIds: new Set(),
      shuffle: noShuffle,
    })

    expect(picked).toHaveLength(10)
    expect(Math.max(...picked.map((w) => w.rank))).toBeLessThanOrEqual(SLICE_SIZE)
  })

  it('sắp theo rank trước khi cắt, không tin thứ tự API trả về', () => {
    const words = [word(3, 30), word(1, 1), word(2, 2)]

    const picked = pickSession({
      words,
      savedIds: new Set(),
      skippedIds: new Set(),
      shuffle: noShuffle,
    })

    expect(picked.map((w) => w.rank)).toEqual([1, 2, 30])
  })

  it('trả bộ ngắn hơn khi chủ đề còn ít từ — đây là ca HỢP LỆ', () => {
    const words = [word(1, 1), word(2, 2), word(3, 3)]

    const picked = pickSession({
      words,
      savedIds: new Set([1]),
      skippedIds: new Set(),
      shuffle: noShuffle,
    })

    expect(picked).toHaveLength(2)
  })

  it('trả rỗng khi đã xử lý hết chủ đề', () => {
    const words = [word(1, 1), word(2, 2)]

    expect(
      pickSession({ words, savedIds: new Set([1]), skippedIds: new Set([2]), shuffle: noShuffle }),
    ).toEqual([])
  })

  it('không đụng mảng gọi vào', () => {
    const words = [word(3, 30), word(1, 1)]
    const before = words.map((w) => w.id)

    pickSession({ words, savedIds: new Set(), skippedIds: new Set() })

    expect(words.map((w) => w.id)).toEqual(before)
  })
})

describe('remainingCount', () => {
  it('đếm từ chưa lưu và chưa bỏ qua', () => {
    const words = [word(1, 1), word(2, 2), word(3, 3)]

    expect(remainingCount(words, new Set([1]), new Set([2]))).toBe(1)
    expect(remainingCount(words, new Set(), new Set())).toBe(3)
    expect(remainingCount(words, new Set([1, 2, 3]), new Set())).toBe(0)
  })
})
