import { useState } from 'react'
import { useNavigate } from 'react-router'
import { StatCard } from '@/components/common/StatCard'
import { CalendarIcon, ChartIcon, HeartIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs } from '@/components/ui/Tabs'
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

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">Thống kê</h1>
        <Tabs
          items={RANGES}
          value={range}
          onChange={(value) => setRange(value as StatsRange)}
          label="Khoảng thời gian"
        />
      </header>

      {stats.isPending ? (
        <div aria-busy className="space-y-3">
          <Skeleton className="h-40 w-full rounded-[--radius-card]" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-36 w-full rounded-[--radius-card]" />
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
        <>
          <Card>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-caption text-text-secondary">Từ đã học</p>
                <p className="text-text-primary text-2xl font-semibold">
                  {stats.data.words_learned}
                </p>
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
        </>
      )}
    </div>
  )
}
