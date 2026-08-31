import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '@/features/auth/hooks'
import { useAuthStore } from '@/stores/auth'
import { fetchStreak, type StreakDelta, type StreakSnapshot } from './api'

/** Query key — nơi duy nhất khai báo, theo quy ước của P2. */
export const streakKeys = {
  summary: ['streak', 'summary'] as const,
  calendar: ['streak', 'summary', 'calendar'] as const,
}

/**
 * Chuỗi cho chip trên header.
 *
 * `staleTime` 60 giây vì chuỗi chỉ đổi khi chính người dùng ghi — và lúc đó ta
 * KHÔNG refetch mà đẩy thẳng dữ liệu từ response vào cache (`useApplyStreak`).
 */
export function useStreak() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: streakKeys.summary,
    queryFn: () => fetchStreak(),
    enabled: token !== null,
    staleTime: 60_000,
  })
}

/**
 * Con số chuỗi để HIỂN THỊ, kèm đường lùi khi ngoại tuyến.
 *
 * Tồn tại để chip trên header và ô "Chuỗi ngày" ở màn Thống kê không thể nói hai
 * con số khác nhau — đó chính là thứ D2 nhắm tới khi gỡ `streak_days` khỏi
 * `/stats/summary`. Hai chỗ tự đọc `useStreak()` rồi tự chọn giá trị mặc định là
 * cách chúng trôi khỏi nhau: một bên ẩn, một bên hiện `0`.
 *
 * `/api/auth/me` được service worker cache còn `/api/streak` thì `no-store`, nên
 * đó là đường duy nhất có số khi mở app lúc mất mạng.
 */
export function useStreakValue(): { current: number | undefined; metToday: boolean } {
  const streak = useStreak()
  const me = useMe()

  return {
    current: streak.data?.current ?? me.data?.streak?.current,
    metToday: streak.data?.met_today ?? me.data?.streak?.met_today ?? false,
  }
}

/** Chuỗi kèm lịch 30 ngày. Chỉ màn `/streak` dùng. */
export function useStreakWithCalendar() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: streakKeys.calendar,
    queryFn: () => fetchStreak(true),
    enabled: token !== null,
    staleTime: 60_000,
  })
}

/**
 * Ghi trạng thái chuỗi từ response của một lượt GHI vào cache.
 *
 * Đây là lý do đường ghi trả `streak` ngay trong response, và nó KHÔNG phải tối
 * ưu hoá cho vui: màn học chủ đề cố ý không invalidate gì sau mỗi thẻ vì ngân
 * sách 60 request/phút theo user (xem `useSaveTopicWord`). Nếu chip phải refetch
 * để nhích thì hoặc nó đứng im tới cuối phiên, hoặc ta phá chính ngân sách đó.
 *
 * Cập nhật `['streak','summary']` bằng tay và chỉ **đánh dấu cũ** bản có lịch:
 * ô lịch của hôm nay cũng vừa đổi, nhưng chỉ màn `/streak` cần và nó sẽ tự
 * refetch khi được mở.
 */
export function useApplyStreak() {
  const queryClient = useQueryClient()

  return (delta: StreakDelta | null | undefined) => {
    if (!delta) return

    const previous = queryClient.getQueryData<StreakSnapshot>(streakKeys.summary)

    if (previous === undefined) {
      /*
       * Chưa có gì trong cache — thường là `/streak` đã lỗi lúc mở app. Không
       * ghép được `delta` vào một snapshot không tồn tại, nhưng cũng KHÔNG được
       * bỏ qua: `staleTime` 60 giây, `refetchOnWindowFocus` tắt, và chip không
       * bao giờ unmount, nên sẽ không có lần refetch nào nữa trong cả phiên —
       * chip đứng ở số cũ tới lúc đóng app.
       *
       * Một request, chỉ ở nhánh lỗi. Ngân sách không bị đụng ở đường thường.
       */
      void queryClient.invalidateQueries({ queryKey: streakKeys.summary })
    } else {
      queryClient.setQueryData<StreakSnapshot>(streakKeys.summary, {
        ...previous,
        current: delta.current,
        met_today: delta.met_today,
      })
    }

    void queryClient.invalidateQueries({ queryKey: streakKeys.calendar, refetchType: 'none' })
  }
}
