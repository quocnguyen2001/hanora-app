import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { useWordHistory } from '../hooks'

function formatDate(iso: string | null): string | null {
  if (iso === null) return null

  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Mục "Lịch sử ôn" ở màn chi tiết từ — trả lời trực tiếp câu hỏi "từ này tôi
 * sai bao nhiêu lần rồi".
 *
 * `enabled` theo trạng thái đã lưu: từ chưa lưu trả 404, gọi nó chỉ để nhận 404
 * là một request thừa trên MỌI lần mở màn chi tiết cộng một dòng đỏ trong
 * console.
 */
export function WordReviewHistory({ wordId, saved }: { wordId: number; saved: boolean }) {
  const history = useWordHistory(wordId, saved)

  if (!saved) return null

  /*
   * Khung xương cho nhịp trễ THẬT: `useSavedWordIds` có `staleTime` nhưng không
   * chắc đã ấm — vào thẳng deep link `/words/:id` thì lần render đầu chưa biết
   * từ đã lưu hay chưa, nên hook này bật lên muộn một nhịp. Không có khung
   * xương thì mục này nhảy vào giữa trang.
   */
  if (history.isPending) {
    return (
      <Card>
        <h2 className="text-section">Lịch sử ôn</h2>
        <Skeleton className="mt-3 h-5 w-2/3" />
      </Card>
    )
  }

  // 404 (chưa lưu) hay lỗi mạng đều xử lý như "không có mục", không phải lỗi:
  // lịch sử ôn là thông tin phụ của màn này.
  if (history.isError) return null

  const data = history.data
  const lastWrong = formatDate(data.last_wrong_at)

  if (data.review_count === 0) {
    return (
      <Card>
        <h2 className="text-section">Lịch sử ôn</h2>
        <p className="text-body text-text-secondary mt-2">Chưa ôn từ này lần nào.</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-section">Lịch sử ôn</h2>
        {data.wrong_count > 0 && <Badge>sai {data.wrong_count} lần</Badge>}
      </div>

      <p className="text-body text-text-secondary mt-2">
        Đã ôn {data.review_count} lần · Đúng {data.correct_count} · Tỉ lệ đúng {data.accuracy}%
      </p>

      {/* Dòng "sai gần nhất" ẩn HẲN khi chưa từng sai — cùng bộ lọc mà
          `wrong_count` dùng, nên hai con số này không thể mâu thuẫn. */}
      {lastWrong && (
        <p className="text-body text-text-secondary mt-1">Sai gần nhất: {lastWrong}</p>
      )}

      {data.recent.length > 0 && (
        <ul aria-label="Các lượt ôn gần nhất" className="mt-3 flex flex-wrap gap-1.5">
          {data.recent.map((answer) => (
            <li
              key={answer.id}
              className={cn(
                'text-caption rounded-control flex h-7 w-7 items-center justify-center',
                answer.is_correct ? 'bg-success/15 text-success' : 'bg-error/15 text-error',
                // Lượt làm lại nhạt hơn: chúng không tính vào ba con số ở trên.
                answer.is_retry && 'opacity-50',
              )}
            >
              <span aria-hidden>{answer.is_correct ? '✓' : '✕'}</span>
              {/* `opacity` và màu là tín hiệu THỊ GIÁC; screen reader cần chữ.
                  `title` một mình không được đọc ổn định. */}
              <span className="sr-only">
                {answer.is_correct ? 'Đúng' : 'Sai'}
                {answer.is_retry && ' (làm lại)'} ngày{' '}
                {new Date(answer.answered_at).toLocaleDateString('vi-VN')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
