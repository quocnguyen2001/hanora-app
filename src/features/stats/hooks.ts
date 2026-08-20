import { useQuery } from '@tanstack/react-query'
import { fetchStatsSummary, type StatsRange } from './api'

export const statsKeys = {
  summary: (range: StatsRange) => ['stats', 'summary', range] as const,
}

export function useStatsSummary(range: StatsRange) {
  return useQuery({
    queryKey: statsKeys.summary(range),
    queryFn: () => fetchStatsSummary(range),
    // Thống kê không cần tức thời, nhưng phải đổi trong cùng phiên học — người
    // dùng ôn xong mở tab này phải thấy số đã nhúc nhích.
    staleTime: 60_000,
  })
}
