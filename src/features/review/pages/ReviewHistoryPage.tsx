import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ReviewHistorySkeleton } from '@/components/ui/PageSkeleton'
import { ApiError } from '@/lib/api'
import { SessionHistoryItem } from '../components/SessionHistoryItem'
import { useSessionHistory } from '../hooks'

export function ReviewHistoryPage() {
  const navigate = useNavigate()
  const history = useSessionHistory()

  const sessions = history.data?.pages.flatMap((page) => page.items) ?? []

  if (history.isPending) {
    return (
      <div aria-busy className="space-y-4">
        <h1 className="text-title">Lịch sử ôn tập</h1>
        <ReviewHistorySkeleton />
      </div>
    )
  }

  if (history.isError) {
    const offline = history.error instanceof ApiError && history.error.isNetworkError

    return (
      <EmptyState
        title={offline ? 'Đang ngoại tuyến' : 'Không tải được lịch sử'}
        /*
         * Lịch sử ôn cố tình KHÔNG được service worker cache (xem `vite.config.ts`):
         * hiện số liệu cũ mà không nói gì còn tệ hơn nói thẳng là cần kết nối.
         */
        description={
          offline ? 'Lịch sử ôn tập cần kết nối để hiện số liệu đúng.' : 'Thử lại giúp mình nhé.'
        }
        action={<Button onClick={() => void history.refetch()}>Thử lại</Button>}
      />
    )
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="Chưa có phiên ôn nào."
        description="Ôn xong một phiên là điểm sẽ được lưu lại ở đây. 🌸"
        action={<Button onClick={() => void navigate('/review')}>Bắt đầu ôn tập</Button>}
      />
    )
  }

  return (
    <div className="animate-rise space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-title">Lịch sử ôn tập</h1>
        <Button variant="ghost" size="sm" onClick={() => void navigate('/review')}>
          Ôn tập
        </Button>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <SessionHistoryItem
            key={session.id}
            session={session}
            onSelect={() => void navigate(`/review/history/${session.id}`)}
          />
        ))}
      </div>

      {history.hasNextPage && (
        <Button
          variant="secondary"
          fullWidth
          disabled={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
        >
          {history.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'}
        </Button>
      )}
    </div>
  )
}
