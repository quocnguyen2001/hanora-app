import { useState } from 'react'
import { useNavigate } from 'react-router'
import { StatCard } from '@/components/common/StatCard'
import { CalendarIcon, ChartIcon, HeartIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatsSkeleton } from '@/components/ui/PageSkeleton'
import { Tabs } from '@/components/ui/Tabs'
import { SessionHistoryItem } from '@/features/review/components/SessionHistoryItem'
import { WeakWordItem } from '@/features/review/components/WeakWordItem'
import { useSessionHistory, useWeakWords } from '@/features/review/hooks'
import { ApiError } from '@/lib/api'
import type { StatsRange } from '../api'
import { DonutChart } from '../components/DonutChart'
import { LineChart } from '../components/LineChart'
import { useStatsSummary } from '../hooks'

const RANGES = [
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
  { value: 'all', label: 'Tất cả' },
] as const

export function StatsPage() {
  const [range, setRange] = useState<StatsRange>('week')
  const navigate = useNavigate()
  const stats = useStatsSummary(range)

  /*
   * Hai nguồn này KHÔNG chịu ảnh hưởng của bộ lọc khoảng thời gian ở trên.
   *
   * Chúng đọc endpoint riêng, không phải `/stats/summary`. "Sửa" cho chúng theo
   * `range` sẽ tạo ra một tham số API không tồn tại — ghi rõ ở đây để lần sau
   * không ai thử.
   */
  const history = useSessionHistory()
  const weakWords = useWeakWords()

  const recentSessions = (history.data?.pages[0]?.items ?? []).slice(0, 5)
  const topWeakWords = (weakWords.data?.pages[0]?.items ?? []).slice(0, 5)

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <h1 className="text-title">Thống kê</h1>
        <Tabs
          items={RANGES}
          value={range}
          onChange={(value) => setRange(value as StatsRange)}
          label="Khoảng thời gian"
        />
      </header>

      {stats.isPending ? (
        <div aria-busy>
          <StatsSkeleton />
        </div>
      ) : stats.isError ? (
        <EmptyState
          title={
            stats.error instanceof ApiError && stats.error.isNetworkError
              ? 'Đang ngoại tuyến'
              : 'Không tải được thống kê'
          }
          description="Thử lại giúp mình nhé."
          action={<Button onClick={() => void stats.refetch()}>Thử lại</Button>}
        />
      ) : stats.data.reviews_count === 0 && stats.data.words_learned === 0 ? (
        <EmptyState
          title="Chưa có số liệu nào."
          description="Hãy ôn tập lần đầu để thấy tiến bộ của bạn. 🌸"
          action={<Button onClick={() => void navigate('/review')}>Bắt đầu ôn tập</Button>}
        />
      ) : (
        /*
          `animate-rise` ở nhánh nội dung, KHÔNG ở gốc trang: tiêu đề và hàng
          tab không đợi mạng nên chúng không được nhấp nháy mỗi lần đổi khoảng
          thời gian. `<>` cũ không mang class được nên đổi thành `<div>`.
        */
        <div className="animate-rise space-y-4">
          <Card>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-caption text-text-secondary">Từ đã học</p>
                <p className="text-text-primary text-stat">{stats.data.words_learned}</p>
              </div>
              {stats.data.words_learned_delta_pct !== 0 && (
                <p
                  className={
                    stats.data.words_learned_delta_pct > 0
                      ? 'text-body text-success'
                      : 'text-body text-text-secondary'
                  }
                >
                  {stats.data.words_learned_delta_pct > 0 ? '+' : ''}
                  {stats.data.words_learned_delta_pct}% so với kỳ trước
                </p>
              )}
            </div>

            <div className="mt-3">
              <LineChart series={stats.data.series} label="Lượt ôn theo ngày" />
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Lượt ôn"
              value={stats.data.reviews_count}
              icon={<ChartIcon size={20} />}
            />
            <StatCard
              label="Chuỗi ngày"
              value={stats.data.streak_days}
              icon={<CalendarIcon size={20} />}
            />
            <StatCard
              label="Độ nhớ"
              value={stats.data.memory_rate}
              suffix="%"
              icon={<HeartIcon size={20} />}
            />
          </div>

          <Card>
            <h2 className="text-section">Phân loại từ</h2>
            <div className="mt-3">
              <DonutChart distribution={stats.data.distribution} />
            </div>
          </Card>

          {/* Ẩn HẲN khi rỗng, không hiện khung trống — cùng quy ước mà
              `VocabularyCard` dùng cho nghĩa Việt thiếu. */}
          {topWeakWords.length > 0 && (
            <Card>
              <h2 className="text-section">Từ hay sai</h2>

              <div className="mt-2 space-y-1">
                {topWeakWords.map((item) => (
                  <WeakWordItem
                    key={item.user_word_id}
                    item={item}
                    onSelect={() => void navigate(`/words/${item.word.id}`)}
                  />
                ))}
              </div>

              <Button
                variant="secondary"
                fullWidth
                className="mt-3"
                // `state.source` được `ModePicker` đọc và VALIDATE — màn ôn mở
                // sẵn đúng nguồn thay vì bắt người dùng chọn lại.
                onClick={() => void navigate('/review', { state: { source: 'weak' } })}
              >
                Ôn những từ này
              </Button>
            </Card>
          )}

          {recentSessions.length > 0 && (
            <Card>
              <h2 className="text-section">Phiên gần đây</h2>

              <div className="mt-3 space-y-3">
                {recentSessions.map((session) => (
                  <SessionHistoryItem
                    key={session.id}
                    session={session}
                    onSelect={() => void navigate(`/review/history/${session.id}`)}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                fullWidth
                className="mt-3"
                onClick={() => void navigate('/review/history')}
              >
                Xem tất cả
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
