import { apiRequest } from '@/lib/api'

export type StatsRange = 'week' | 'month' | 'year' | 'all'

/**
 * `streak_days` KHÔNG còn ở đây, và đó là chủ đích.
 *
 * Endpoint này được server bọc trong cache 60 giây × 4 range, nên một con số
 * phải nhích ngay khi người dùng vừa học sẽ luôn trễ tới một phút so với chip
 * trên header. Chuỗi có endpoint riêng, không cache: `features/streak`.
 */
export interface StatsSummary {
  range: StatsRange
  words_learned: number
  words_learned_delta_pct: number
  reviews_count: number
  memory_rate: number
  series: { label: string; value: number }[]
  distribution: { new: number; learning: number; mastered: number }
}

export function fetchStatsSummary(range: StatsRange): Promise<StatsSummary> {
  return apiRequest<StatsSummary>('/stats/summary', { query: { range } })
}
