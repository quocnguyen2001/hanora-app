import { apiRequest } from '@/lib/api'

export type StatsRange = 'week' | 'month' | 'year' | 'all'

export interface StatsSummary {
  range: StatsRange
  words_learned: number
  words_learned_delta_pct: number
  reviews_count: number
  streak_days: number
  memory_rate: number
  series: { label: string; value: number }[]
  distribution: { new: number; learning: number; mastered: number }
}

export function fetchStatsSummary(range: StatsRange): Promise<StatsSummary> {
  return apiRequest<StatsSummary>('/stats/summary', { query: { range } })
}
