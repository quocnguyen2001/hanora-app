import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { SearchModeChoice } from '@/stores/search-mode'
import { fetchSentence, fetchWord, searchWords } from './api'

/** Query key — nơi duy nhất khai báo, theo quy ước P2. */
export const dictionaryKeys = {
  /*
   * `mode` PHẢI nằm trong key.
   *
   * Thiếu nó thì bấm toggle xong TanStack Query trả lại kết quả cũ từ cache và
   * toggle trông như hỏng — cùng một `query`, hai kết quả hoàn toàn khác nhau.
   */
  search: (query: string, mode: SearchModeChoice) => ['dictionary', 'search', mode, query] as const,
  word: (id: number) => ['dictionary', 'word', id] as const,
  /*
   * Khoá theo chính chuỗi Hán, đúng như khoá cache phía API. Câu không có id,
   * và hai truy vấn tiếng Việt khác nhau có thể dẫn tới cùng một câu — dùng câu
   * làm khoá thì cả hai chia sẻ một lần phân tích.
   */
  sentence: (zh: string) => ['dictionary', 'sentence', zh] as const,
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
export function useSearchWords(query: string, mode: SearchModeChoice) {
  return useQuery({
    queryKey: dictionaryKeys.search(query, mode),
    queryFn: () => searchWords(query, mode),
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

/**
 * Chi tiết một câu.
 *
 * KHÔNG `retry` mặc định của TanStack Query: mỗi lần thử là một lời gọi Gemini
 * ~4 giây và tốn tiền. API đã tự đếm và dừng sau 3 lần hỏng, nên thử lại tự động
 * ở đây chỉ đốt hạn mức đó nhanh hơn. Người dùng bấm "Thử lại" thì mới gọi.
 */
export function useSentence(zh: string) {
  return useQuery({
    queryKey: dictionaryKeys.sentence(zh),
    queryFn: () => fetchSentence(zh),
    enabled: zh.trim().length > 0,
    retry: false,
  })
}
