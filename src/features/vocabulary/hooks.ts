import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as vocabularyApi from './api'

export const vocabularyKeys = {
  list: (filters: { status?: string; q?: string }) => ['vocabulary', 'list', filters] as const,
  ids: ['vocabulary', 'ids'] as const,
}

/**
 * Tập `word_id` đã lưu, dùng cho MỌI card ở màn tìm kiếm lẫn màn chi tiết.
 *
 * Trả `Set` để tra O(1): màn tìm kiếm render 20 card và mỗi card cần biết trạng
 * thái của nó.
 */
export function useSavedWordIds() {
  return useQuery({
    queryKey: vocabularyKeys.ids,
    queryFn: async () => new Set(await vocabularyApi.fetchSavedWordIds()),
    // Dữ liệu theo user và đổi mỗi lần lưu/bỏ lưu — không cache lâu như từ điển.
    staleTime: 30_000,
  })
}

export function useVocabulary(filters: { status?: string; q?: string }) {
  return useInfiniteQuery({
    queryKey: vocabularyKeys.list(filters),
    queryFn: ({ pageParam }) => vocabularyApi.fetchVocabulary({ ...filters, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

/**
 * Lưu / bỏ lưu với optimistic update.
 *
 * Cập nhật `['vocabulary','ids']` chứ không phải danh sách kết quả tìm kiếm:
 * response từ điển không mang trạng thái theo user, nên chỉ có một chỗ duy nhất
 * cần đổi và mọi card đọc chung từ đó. Đây cũng là lý do optimistic update ở
 * đây không dính bug shape của infinite query (red team M1).
 */
export function useToggleSaveWord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ wordId, userWordId }: { wordId: number; userWordId: number | null }) => {
      if (userWordId === null) {
        await vocabularyApi.saveWord(wordId)
        return
      }

      await vocabularyApi.removeWord(userWordId)
    },
    onMutate: async ({ wordId, userWordId }) => {
      await queryClient.cancelQueries({ queryKey: vocabularyKeys.ids })

      const previous = queryClient.getQueryData<Set<number>>(vocabularyKeys.ids)
      const next = new Set(previous ?? [])

      if (userWordId === null) {
        next.add(wordId)
      } else {
        next.delete(wordId)
      }

      queryClient.setQueryData(vocabularyKeys.ids, next)

      return { previous }
    },
    onError: (_error, _variables, context) => {
      // Rollback về đúng trạng thái trước đó — không phải xóa cache, vì xóa sẽ
      // làm mọi card nhấp nháy về "chưa lưu" trước khi tải lại.
      if (context?.previous) {
        queryClient.setQueryData(vocabularyKeys.ids, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: vocabularyKeys.ids })
      void queryClient.invalidateQueries({ queryKey: ['vocabulary', 'list'] })
    },
  })
}
