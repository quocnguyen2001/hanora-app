import type { ReviewAnswer } from './history-api'

/**
 * Thời gian trả lời một thẻ.
 *
 * Dưới 1 phút thì hiện giây có một chữ số thập phân — chênh lệch 3s và 3.4s là
 * thứ người học cảm nhận được, còn làm tròn hết về "3s" thì mọi thẻ trông giống
 * nhau. Trên 1 phút thì phần thập phân vô nghĩa.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s'
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`

  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1000)

  return `${minutes}p ${String(seconds).padStart(2, '0')}s`
}

/**
 * Thời gian trung bình trên các lượt CÓ số đo.
 *
 * Loại lượt làm lại để khớp với mẫu số của điểm, và trả `null` khi không lượt
 * nào có số đo — hiện "0s" ở đó là bịa ra một con số.
 */
export function averageDurationMs(answers: ReviewAnswer[]): number | null {
  const measured = answers.filter((answer) => !answer.is_retry && answer.duration_ms !== null)

  if (measured.length === 0) return null

  const total = measured.reduce((sum, answer) => sum + (answer.duration_ms ?? 0), 0)

  return Math.round(total / measured.length)
}
