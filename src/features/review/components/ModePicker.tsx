import { useState } from 'react'
import { useLocation } from 'react-router'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { useReviewStore } from '@/stores/review'
import type { ReviewMode, ReviewSource } from '../api'

export interface SessionConfig {
  mode: ReviewMode
  source: ReviewSource
  limit: number
}

const MODES = [
  {
    value: 'mcq' as const,
    title: 'Trắc nghiệm',
    description: 'Nhìn chữ Hán, chọn âm Hán-Việt đúng trong 4 lựa chọn.',
  },
  {
    value: 'typing' as const,
    title: 'Gõ lại',
    description: 'Nhìn âm Hán-Việt, viết lại chữ Hán. Chấp nhận cả pinyin.',
  },
]

const SOURCES = [
  { value: 'due' as const, label: 'Tới hạn', hint: 'theo lịch' },
  { value: 'weak' as const, label: 'Từ hay sai', hint: 'bỏ qua lịch' },
]

/**
 * `Segmented` chỉ nhận giá trị chuỗi, nên số thẻ đi qua chuỗi rồi mới đổi lại.
 */
const LIMITS = [
  { value: '10' as const, label: '10' },
  { value: '20' as const, label: '20' },
  { value: '30' as const, label: '30' },
]

/**
 * Đọc nguồn từ `location.state` — trang Thống kê điều hướng sang đây kèm
 * `{ source: 'weak' }` khi người dùng bấm "Ôn những từ này".
 *
 * VALIDATE bằng union, không tin thẳng: `location.state` là dữ liệu ngoài và nó
 * đi thẳng vào body request nếu không kiểm.
 */
function sourceFromLocation(state: unknown): ReviewSource | null {
  if (!state || typeof state !== 'object' || !('source' in state)) return null

  const { source } = state

  return source === 'due' || source === 'weak' ? source : null
}

export function ModePicker({ onStart }: { onStart: (config: SessionConfig) => void }) {
  const location = useLocation()
  const store = useReviewStore()

  const [source, setSource] = useState<ReviewSource>(
    sourceFromLocation(location.state) ?? store.lastSource,
  )
  const [limit, setLimit] = useState(String(store.lastLimit))

  function start(picked: ReviewMode) {
    // Side effect ở event handler, KHÔNG ở effect hay lúc render.
    store.setLastMode(picked)
    store.setLastSource(source)
    store.setLastLimit(Number(limit))

    onStart({ mode: picked, source, limit: Number(limit) })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-title">Ôn tập</h1>
        <p className="text-body text-text-secondary">Chọn cách ôn cho phiên này.</p>
      </div>

      <Card className="space-y-4">
        <div className="space-y-2">
          <p className="text-caption text-text-secondary">Ôn từ nào</p>
          <Segmented items={SOURCES} value={source} onChange={setSource} label="Nguồn từ ôn tập" />
        </div>

        <div className="space-y-2">
          <p className="text-caption text-text-secondary">Số thẻ</p>
          <Segmented
            items={LIMITS}
            value={limit}
            onChange={setLimit}
            label="Số thẻ mỗi phiên"
            columns="even"
          />
        </div>
      </Card>

      {MODES.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => start(item.value)}
          className="w-full text-left"
        >
          <Card interactive className="hover:bg-primary-pale">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-section text-text-primary">{item.title}</p>
              {/* Gợi ý chế độ lần trước, không phải trạng thái chọn — bấm mới là chọn. */}
              {store.lastMode === item.value && (
                <span className="text-caption text-text-secondary">lần trước</span>
              )}
            </div>
            <p className="text-body text-text-secondary mt-1">{item.description}</p>
          </Card>
        </button>
      ))}
    </div>
  )
}
