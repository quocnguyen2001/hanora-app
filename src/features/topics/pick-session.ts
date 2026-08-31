import type { TopicWord } from './api'

/**
 * Lát cắt "thông dụng nhất" để bốc ngẫu nhiên bên trong.
 *
 * Bốc đều trên cả bộ sẽ trả `凝聚` ngang hàng `爱`; bốc thẳng N từ đầu thì hai
 * phiên liên tiếp giống hệt nhau khi người dùng bỏ qua hết. Lát cắt giữ được cả
 * hai tính chất.
 */
export const SLICE_SIZE = 30

/** Số thẻ mỗi phiên. */
export const SESSION_SIZE = 10

/**
 * Bốc bộ thẻ cho một phiên.
 *
 * Hàm THUẦN, tách khỏi component để test được mà không dựng cả trang — và để
 * `shuffle` truyền vào được, nên test không phụ thuộc `Math.random`.
 */
export function pickSession(input: {
  words: TopicWord[]
  savedIds: ReadonlySet<number>
  skippedIds: ReadonlySet<number>
  size?: number
  shuffle?: <T>(items: T[]) => T[]
}): TopicWord[] {
  const { words, savedIds, skippedIds, size = SESSION_SIZE, shuffle = shuffleInPlace } = input

  const pool = words
    .filter((word) => !savedIds.has(word.id) && !skippedIds.has(word.id))
    // API đã sắp theo `rank`, nhưng đừng dựa vào đó: thứ tự là một phần của
    // hợp đồng học tập, không phải tiện nghi hiển thị.
    .sort((a, b) => a.rank - b.rank)

  return shuffle(pool.slice(0, SLICE_SIZE)).slice(0, size)
}

/** Số từ còn lại chưa xử lý — dùng cho nút "Bắt đầu" và màn "đã học hết". */
export function remainingCount(
  words: TopicWord[],
  savedIds: ReadonlySet<number>,
  skippedIds: ReadonlySet<number>,
): number {
  return words.filter((word) => !savedIds.has(word.id) && !skippedIds.has(word.id)).length
}

/** Fisher-Yates trên một BẢN SAO — không đụng mảng gọi vào. */
function shuffleInPlace<T>(items: T[]): T[] {
  const copy = [...items]

  // Gán qua biến trung gian thay vì hoán vị bằng destructuring: với
  // `noUncheckedIndexedAccess`, `copy[j]` có kiểu `T | undefined`.
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = copy[i] as T

    copy[i] = copy[j] as T
    copy[j] = swap
  }

  return copy
}
