import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

/**
 * Tổng kết một phiên học.
 *
 * Hai lối đi, và thứ tự có chủ đích: "Ôn ngay" đứng trước vì đó là chỗ từ vừa
 * thêm thực sự đi vào trí nhớ — thẻ chỉ giới thiệu, `/review` mới là bài kiểm.
 */
export function TopicSessionSummary({
  saved,
  skipped,
  hasMore,
  onReview,
  onContinue,
  onBack,
  continuing,
}: {
  saved: number
  skipped: number
  hasMore: boolean
  onReview: () => void
  onContinue: () => void
  onBack: () => void
  continuing: boolean
}) {
  return (
    <div className="space-y-4">
      <Card size="hero" className="space-y-3 text-center">
        <h2 className="text-section">Xong phiên này 🌸</h2>
        <p className="text-body text-text-secondary">
          Đã thêm <strong className="text-text-primary">{saved}</strong> từ vào kho
          {skipped > 0 && <> · bỏ qua {skipped} từ</>}
        </p>
      </Card>

      <div className="space-y-2">
        {saved > 0 && (
          <Button className="w-full" onClick={onReview}>
            Ôn ngay {saved} từ vừa thêm
          </Button>
        )}

        {hasMore && (
          <Button variant="secondary" className="w-full" onClick={onContinue} disabled={continuing}>
            {continuing ? 'Đang chuẩn bị…' : 'Học tiếp chủ đề này'}
          </Button>
        )}

        <Button variant="ghost" className="w-full" onClick={onBack}>
          Về danh sách chủ đề
        </Button>
      </div>
    </div>
  )
}
