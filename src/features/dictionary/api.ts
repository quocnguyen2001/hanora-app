import { apiRequestWithMeta, apiRequest } from '@/lib/api'
import type { SearchModeChoice } from '@/stores/search-mode'
import type { SearchMeta, WordDetail, WordSummary } from '@/types/dictionary'

/**
 * `mode` quyết định API chạy nhánh nào cho chuỗi latin: `vi` chỉ âm Hán-Việt và
 * nghĩa tiếng Việt, `cn` chỉ chữ Hán và pinyin.
 *
 * `null` → KHÔNG gửi tham số, và API tự đoán bằng `QueryClassifier` như trước.
 * Bỏ hẳn khỏi query string chứ không gửi chuỗi rỗng: `mode=` sẽ trượt luật
 * `Rule::in` và trả 422.
 */
export async function searchWords(
  query: string,
  mode: SearchModeChoice,
  page = 1,
): Promise<{ words: WordSummary[]; meta: SearchMeta }> {
  const { data, meta } = await apiRequestWithMeta<WordSummary[]>('/dictionary/search', {
    query: { q: query, page, ...(mode === null ? {} : { mode }) },
  })

  return { words: data, meta: meta as SearchMeta }
}

export function fetchWord(id: number): Promise<WordDetail> {
  return apiRequest<WordDetail>(`/dictionary/words/${id}`)
}
