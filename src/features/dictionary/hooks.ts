import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { SearchModeChoice } from '@/stores/search-mode'
import { fetchSentence, fetchWord, fetchWordIllustration, searchWords } from './api'

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
  illustration: (id: number) => ['dictionary', 'illustration', id] as const,
}

/*
 * Một chữ Hán đơn đã là truy vấn đầy đủ; một chữ cái latin thì chưa bao giờ.
 *
 * `h` khớp hàng nghìn mục và vẫn kéo theo một lượt dịch bằng AI ở phía API —
 * tốn tiền cho một truy vấn chắc chắn chưa gõ xong. Chặn ở đây thay vì ở màn
 * hình để mọi chỗ gọi `useSearchWords` đều được bảo vệ như nhau.
 */
const HAS_HAN = /[\u3400-\u9fff]/

export function isSearchableQuery(query: string): boolean {
  const trimmed = query.trim()

  return HAS_HAN.test(trimmed) ? trimmed.length > 0 : trimmed.length >= 2
}

/**
 * Kết quả tìm kiếm.
 *
 * `placeholderData` giữ nguyên danh sách cũ trong lúc tải danh sách mới, nên gõ
 * tiếp không làm màn hình nhấp nháy về trống rồi hiện lại.
 *
 * `staleTime` dài kế thừa từ query client: dữ liệu từ điển gần như bất biến, và
 * đó là thứ khiến gõ lại một từ đã tra cảm giác tức thì.
 *
 * `signal` đi thẳng vào `fetch`: gõ tiếp là request cũ bị hủy, không để lại một
 * chuỗi request treo mỗi khi người dùng gõ nhanh hơn mạng trả lời.
 */
export function useSearchWords(query: string, mode: SearchModeChoice) {
  return useQuery({
    queryKey: dictionaryKeys.search(query, mode),
    queryFn: ({ signal }) => searchWords(query, mode, 1, signal),
    enabled: isSearchableQuery(query),
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

/**
 * Nhịp hỏi lại khi API còn báo `pending`, khớp `Retry-After: 3` mà nó trả về.
 */
const ILLUSTRATION_POLL_MS = 3000

/**
 * Trần số lần hỏi lại (~30 giây).
 *
 * KHÔNG có trần thì một job kẹt ở `pending` để lại một vòng poll chạy mãi suốt
 * thời gian người dùng còn mở trang — một request mỗi 3 giây cho một câu trả
 * lời không bao giờ tới.
 */
const ILLUSTRATION_MAX_POLLS = 10

/**
 * Ảnh minh hoạ của một từ.
 *
 * `retry: false` — API đã tự đếm và dừng hẳn sau 3 lần hỏng, nên thử lại tự
 * động ở đây chỉ đốt hạn mức đó nhanh hơn. Cùng lý do `useSentence` đã ghi.
 *
 * Không cần `placeholderData`: ô ảnh đã có khung placeholder riêng nên không
 * bao giờ nhấp nháy về trống.
 */
export function useWordIllustration(id: number) {
  return useQuery({
    queryKey: dictionaryKeys.illustration(id),
    queryFn: () => fetchWordIllustration(id),
    enabled: Number.isFinite(id) && id > 0,
    retry: false,
    refetchInterval: (query) => {
      if (query.state.data?.status !== 'pending') return false

      // `dataUpdateCount` đếm số lần queryFn trả về thành công, tức đúng số lần
      // đã hỏi. Chạm trần thì thôi, coi như từ này không có ảnh.
      return query.state.dataUpdateCount >= ILLUSTRATION_MAX_POLLS ? false : ILLUSTRATION_POLL_MS
    },
  })
}
