import { useNavigate } from 'react-router'
import { FlameIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { ApiError } from '@/lib/api'
import { StreakCalendar } from '../components/StreakCalendar'
import { useStreakWithCalendar } from '../hooks'

export function StreakPage() {
  const streak = useStreakWithCalendar()
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-title">Chuỗi ngày</h1>
      </header>

      {streak.isPending ? (
        <div aria-busy>
          {/* Cùng khung xương với lúc chunk đang tải — không nhảy bố cục giữa chừng. */}
          <PageSkeleton pathname="/streak" />
        </div>
      ) : streak.isError ? (
        <EmptyState
          title={
            streak.error instanceof ApiError && streak.error.isNetworkError
              ? 'Đang ngoại tuyến'
              : 'Không tải được chuỗi ngày'
          }
          description="Thử lại giúp mình nhé."
          action={<Button onClick={() => void streak.refetch()}>Thử lại</Button>}
        />
      ) : streak.data.current === 0 && streak.data.longest === 0 ? (
        /*
          Trạng thái rỗng nói thẳng LUẬT, không hiện một cái lịch 30 ô xám.
          Người chưa từng đạt ngày nào cần biết phải làm gì, không cần thấy 30 ô
          trống nhắc rằng họ chưa làm gì.
        */
        <EmptyState
          title="Chưa có chuỗi nào."
          description={`Học ${streak.data.today.words_goal} từ mới hoặc ôn xong một phiên trong ngày là bắt đầu được chuỗi đầu tiên. 🌱`}
          action={<Button onClick={() => void navigate('/topics')}>Học từ mới</Button>}
        />
      ) : (
        <div className="animate-rise space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-text-secondary">Chuỗi hiện tại</p>
                <p className="text-text-primary text-stat flex items-center gap-2">
                  <FlameIcon
                    size={28}
                    filled={streak.data.met_today}
                    className={streak.data.met_today ? 'text-primary' : 'text-text-secondary'}
                  />
                  {streak.data.current}
                </p>
              </div>
              <div className="text-right">
                <p className="text-caption text-text-secondary">Dài nhất</p>
                <p className="text-text-primary text-stat">{streak.data.longest}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-caption text-text-secondary mb-3">Hôm nay</h2>
            <TodayProgress today={streak.data.today} metToday={streak.data.met_today} />

            {!streak.data.met_today && (
              <div className="mt-4 flex gap-2">
                {/*
                  Đưa người dùng tới việc GẦN ĐẠT NHẤT, không phải một menu.
                  Đã thêm được vài từ thì học tiếp rẻ hơn là mở một phiên ôn.
                */}
                <Button
                  onClick={() =>
                    void navigate(streak.data.today.words_added > 0 ? '/topics' : '/review')
                  }
                >
                  {streak.data.today.words_added > 0 ? 'Học tiếp' : 'Ôn tập ngay'}
                </Button>
              </div>
            )}
          </Card>

          {streak.data.calendar !== undefined && (
            <Card>
              <h2 className="text-caption text-text-secondary mb-3">30 ngày gần đây</h2>
              <StreakCalendar days={streak.data.calendar} />
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function TodayProgress({
  today,
  metToday,
}: {
  today: { words_added: number; session_finished: boolean; words_goal: number }
  metToday: boolean
}) {
  if (metToday) {
    return <p className="text-text-primary text-body">Đã đạt mục tiêu hôm nay. 🎉</p>
  }

  return (
    <ul className="text-body text-text-secondary space-y-1">
      {/*
        Hai điều kiện hiện CẢ HAI, kể cả cái chưa chạm tới: mục tiêu là "một
        trong hai", và giấu vế còn lại sẽ khiến người dùng tưởng chỉ có một
        đường đạt.
      */}
      <li>
        Từ mới:{' '}
        <span className="text-text-primary tabular-nums">
          {today.words_added}/{today.words_goal}
        </span>
      </li>
      <li>Phiên ôn: {today.session_finished ? 'đã xong' : 'chưa xong phiên nào'}</li>
    </ul>
  )
}
