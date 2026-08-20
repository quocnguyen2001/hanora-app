import { apiRequestWithMeta, apiRequest } from '@/lib/api'
import type { SearchMeta, WordDetail, WordSummary } from '@/types/dictionary'

export async function searchWords(
  query: string,
  page = 1,
): Promise<{ words: WordSummary[]; meta: SearchMeta }> {
  const { data, meta } = await apiRequestWithMeta<WordSummary[]>('/dictionary/search', {
    query: { q: query, page },
  })

  return { words: data, meta: meta as SearchMeta }
}

export function fetchWord(id: number): Promise<WordDetail> {
  return apiRequest<WordDetail>(`/dictionary/words/${id}`)
}
