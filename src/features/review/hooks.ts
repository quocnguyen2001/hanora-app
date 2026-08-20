import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { vocabularyKeys } from '@/features/vocabulary/hooks'
import * as reviewApi from './api'
import type { ReviewMode } from './api'

export const reviewKeys = {
  session: (mode: ReviewMode) => ['reviews', 'session', mode] as const,
}

export function useReviewSession(mode: ReviewMode | null) {
  return useQuery({
    queryKey: reviewKeys.session(mode ?? 'mcq'),
    queryFn: () => reviewApi.fetchSession(mode ?? 'mcq'),
    enabled: mode !== null,
    // Phiên ôn là ảnh chụp tại thời điểm bắt đầu — không tự làm mới giữa chừng,
    // vì đổi danh sách thẻ khi người dùng đang làm là chuyện khó hiểu nhất có thể.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnMount: false,
  })
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reviewApi.submitAnswer,
    onSuccess: (_result, variables) => {
      // Chỉ lượt ĐẦU mới đổi lịch ôn và trạng thái từ (P14). Lượt làm lại không
      // đụng gì nên không cần làm mới kho từ.
      if (!variables.is_retry) {
        void queryClient.invalidateQueries({ queryKey: ['vocabulary', 'list'] })
        void queryClient.invalidateQueries({ queryKey: vocabularyKeys.ids })
        void queryClient.invalidateQueries({ queryKey: ['stats'] })
      }
    },
  })
}
