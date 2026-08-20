import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchWord, searchWords } from './api'

/** Query key — nơi duy nhất khai báo, theo quy ước P2. */
export const dictionaryKeys = {
  search: (query: string) => ['dictionary', 'search', query] as const,
  word: (id: number) => ['dictionary', 'word', id] as const,
}

/**
 * Kết quả tìm kiếm.
 *
 * `placeholderData` giữ nguyên danh sách cũ trong lúc tải danh sách mới, nên gõ
 * tiếp không làm màn hình nhấp nháy về trống rồi hiện lại.
 *
 * `staleTime` dài kế thừa từ query client: dữ liệu từ điển gần như bất biến, và
 * đó là thứ khiến gõ lại một từ đã tra cảm giác tức thì.
 */
export function useSearchWords(query: string) {
  return useQuery({
    queryKey: dictionaryKeys.search(query),
    queryFn: () => searchWords(query),
    enabled: query.trim().length > 0,
    placeholderData: (previous) => previous,
  })
}

export function useWord(id: number) {
  return useQuery({
    queryKey: dictionaryKeys.word(id),
    queryFn: () => fetchWord(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

/**
 * Nạp trước chi tiết từ để P8 mở tức thì.
 *
 * Gọi khi kết quả hiện ra; dữ liệu từ điển tĩnh nên nạp trước không bao giờ
 * lãng phí theo nghĩa "dữ liệu cũ".
 */
export function usePrefetchWord() {
  const queryClient = useQueryClient()

  return (id: number) =>
    void queryClient.prefetchQuery({
      queryKey: dictionaryKeys.word(id),
      queryFn: () => fetchWord(id),
    })
}
