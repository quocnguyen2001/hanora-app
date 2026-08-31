import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { saveWord } from '@/features/vocabulary/api'
import { vocabularyKeys } from '@/features/vocabulary/hooks'
import * as topicsApi from './api'

export const topicKeys = {
  all: ['topics'] as const,
  list: () => ['topics', 'list'] as const,
  words: (slug: string) => ['topics', 'words', slug] as const,
  skips: () => ['topics', 'skips'] as const,
}

/**
 * Lưới chủ đề kèm tiến độ.
 *
 * Tự poll khi còn chủ đề đang sinh — đó là cách app biết job đã xong mà không
 * cần endpoint trạng thái riêng. Hết `generating` thì dừng hẳn: một vòng poll
 * chạy mãi cho một câu trả lời không bao giờ tới là đúng thứ trần
 * `LAZY_MAX_POLLS` bên lớp ảnh tồn tại để chặn.
 */
export function useTopics() {
  return useQuery({
    queryKey: topicKeys.list(),
    queryFn: topicsApi.fetchTopics,
    staleTime: 30_000,
    refetchInterval: (query) =>
      query.state.data?.some((topic) => topic.status === 'generating') ? 3000 : false,
  })
}

/** Tạo chủ đề mới; làm mới lưới ngay để thẻ `generating` xuất hiện. */
export function useCreateTopic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: topicsApi.createTopic,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: topicKeys.list() }),
  })
}

export function useDeleteTopic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: topicsApi.deleteTopic,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: topicKeys.list() }),
  })
}

/**
 * CẢ BỘ từ của một chủ đề.
 *
 * Bộ nhỏ (35-114 từ, đo thật) nên giữ hết ở client là rẻ, và nó cho phép bốc
 * thẻ mà không cần state phiên phía server.
 */
export function useTopicWords(slug: string) {
  return useQuery({
    queryKey: topicKeys.words(slug),
    queryFn: () => topicsApi.fetchTopicWords(slug),
    staleTime: 5 * 60_000,
  })
}

export function useSkippedWordIds() {
  return useQuery({
    queryKey: topicKeys.skips(),
    queryFn: async () => new Set(await topicsApi.fetchSkippedWordIds()),
    staleTime: 30_000,
  })
}

/**
 * Thêm từ vào kho TỪ MÀN HỌC CHỦ ĐỀ.
 *
 * Cố tình KHÔNG dùng `useToggleSaveWord`: hook đó invalidate
 * `vocabularyKeys.ids` ở `onSettled`, và query đó đang ACTIVE vì chính màn học
 * dùng nó để lọc pool — nên mỗi thẻ sẽ đẻ thêm một refetch. Mười thẻ cộng vòng
 * poll ảnh là đủ chạm trần 60 request/phút của API.
 *
 * Ở đây gom invalidate về CUỐI phiên (`useFinishTopicSession`).
 *
 * Và KHÔNG optimistic: `api.ts` chặn mọi non-GET khi offline với hợp đồng ghi
 * thẳng trong file — *"offline chỉ ĐỌC… và tuyệt đối không giả vờ đã lưu"*.
 * Lạc quan ở đây đúng là giả vờ đã lưu: người dùng mất mạng ở thẻ 2 sẽ học hết
 * phiên, thấy "đã thêm 6 từ", rồi vào `/review` không thấy gì.
 */
export function useSaveTopicWord() {
  return useMutation({ mutationFn: (wordId: number) => saveWord(wordId) })
}

/** Bỏ qua một từ. Cũng không optimistic, cùng lý do. */
export function useSkipTopicWord() {
  return useMutation({ mutationFn: (wordId: number) => topicsApi.skipWord(wordId) })
}

/**
 * Dọn cache sau khi phiên kết thúc.
 *
 * `await` chứ không phải bắn-và-quên, và đó là điểm mấu chốt của nút "Học tiếp
 * chủ đề này": `invalidateQueries` bất đồng bộ và trả `data` CŨ trong lúc
 * refetch (`useSavedWordIds` có `staleTime: 30s`). Bốc bộ mới ngay sau khi
 * invalidate sẽ phát lại đúng 10 từ vừa học.
 */
export function useFinishTopicSession() {
  const queryClient = useQueryClient()

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: vocabularyKeys.ids }),
      queryClient.invalidateQueries({ queryKey: topicKeys.skips() }),
      queryClient.invalidateQueries({ queryKey: topicKeys.list() }),
    ])
  }
}
