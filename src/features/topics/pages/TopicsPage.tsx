import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { TopicsGridSkeleton } from '@/components/ui/PageSkeleton'
import { ApiError } from '@/lib/api'
import { NewTopicForm } from '../components/NewTopicForm'
import { TopicCard } from '../components/TopicCard'
import { useDeleteTopic, useTopics } from '../hooks'

/**
 * Lưới chủ đề.
 *
 * BỐN trạng thái, không phải ba. Mảng rỗng là trạng thái riêng: hàng trong bảng
 * `topics` do chính `topics:import` tạo, nên quên chạy lệnh đó ở deploy thì
 * `GET /topics` trả `[]` và lưới không có thẻ nào — app không biết 16 chủ đề
 * nào tồn tại vì danh mục nằm ở backend. Gộp nó vào nhánh "có dữ liệu" sẽ cho
 * ra một trang trắng có tiêu đề, đúng lúc người dùng bấm "học từ mới".
 */
export function TopicsPage() {
  const navigate = useNavigate()
  const topics = useTopics()
  const remove = useDeleteTopic()
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-title">Học theo chủ đề</h1>
            <p className="text-body text-text-secondary">
              Chọn một chủ đề để gặp những từ bạn chưa học.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            + Chủ đề mới
          </Button>
        </div>
      </header>

      <NewTopicForm open={creating} onClose={() => setCreating(false)} />

      {topics.isPending ? (
        <div aria-busy>
          <TopicsGridSkeleton />
        </div>
      ) : topics.isError ? (
        <OfflineOrError error={topics.error} onRetry={() => void topics.refetch()} />
      ) : topics.data.length === 0 ? (
        <EmptyState
          title="Chưa có chủ đề nào."
          description="Dữ liệu chủ đề chưa được nạp. Nếu bạn là người quản trị, hãy chạy `topics:import`."
          action={<Button onClick={() => void navigate('/search')}>Về tìm kiếm</Button>}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {topics.data.map((topic) => (
            <li key={topic.slug}>
              <TopicCard
                topic={topic}
                onDelete={topic.is_custom ? () => remove.mutate(topic.slug) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Ngoại tuyến nói thẳng lý do, không hiện lưới rỗng câm.
 *
 * `/topics` mang tiến độ theo user nên `private, no-store` — nó KHÔNG chạy
 * ngoại tuyến được, cùng hoàn cảnh mà màn Ôn tập đã nói rõ với người dùng.
 */
function OfflineOrError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const offline = error instanceof ApiError && error.isNetworkError

  return (
    <EmptyState
      title={offline ? 'Đang ngoại tuyến' : 'Không tải được danh sách chủ đề'}
      description={
        offline
          ? 'Học từ mới cần kết nối để lưu từ vào kho. Kho từ đã lưu vẫn xem được khi ngoại tuyến.'
          : 'Thử lại giúp mình nhé.'
      }
      action={<Button onClick={onRetry}>Thử lại</Button>}
    />
  )
}
