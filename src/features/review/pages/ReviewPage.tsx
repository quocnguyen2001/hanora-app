import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ApiError } from '@/lib/api'
import { useReviewStore } from '@/stores/review'
import { isMcqItem, type AnswerResult, type ReviewItem, type ReviewMode } from '../api'
import { AnswerFeedback } from '../components/AnswerFeedback'
import { McqCard } from '../components/McqCard'
import { ModePicker } from '../components/ModePicker'
import { ReviewProgress } from '../components/ReviewProgress'
import { SessionSummary, type SessionResult } from '../components/SessionSummary'
import { TypingCard } from '../components/TypingCard'
import { useReviewSession, useSubmitAnswer } from '../hooks'

export function ReviewPage() {
  const [mode, setMode] = useState<ReviewMode | null>(null)
  const store = useReviewStore()

  function pickMode(next: ReviewMode) {
    // Side effect nằm ở event handler, KHÔNG ở effect hay lúc render.
    store.setLastMode(next)
    store.resetSession()
    setMode(next)
  }

  if (mode === null) {
    return <ModePicker onPick={pickMode} />
  }

  // `key` để đổi mode dựng lại toàn bộ state phiên, không rò thẻ cũ sang mode mới.
  return <ReviewSession key={mode} mode={mode} onExit={() => setMode(null)} />
}

function ReviewSession({ mode, onExit }: { mode: ReviewMode; onExit: () => void }) {
  const navigate = useNavigate()
  const session = useReviewSession(mode)
  const submit = useSubmitAnswer()
  const store = useReviewStore()

  /**
   * Hàng đợi thẻ của phiên. Từ trả lời SAI được đẩy lại cuối hàng đợi.
   *
   * Giữ hàng đợi ở state cục bộ chứ không ở query cache: nó là tiến độ của lần
   * làm này, không phải dữ liệu server.
   */
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const [typed, setTyped] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [done, setDone] = useState<SessionResult>({ correct: 0, total: 0, wrong: [] })
  const [finished, setFinished] = useState(false)

  const items = useMemo(() => session.data?.items ?? [], [session.data])

  /*
   * Nạp hàng đợi từ phiên mới bằng cách CHỈNH STATE LÚC RENDER, không phải bằng
   * `useEffect`.
   *
   * Đây là pattern React khuyến nghị cho "state dẫn xuất phải reset khi prop
   * đổi": nó chạy đồng bộ trước khi commit nên không có một lần render trung
   * gian với hàng đợi rỗng, còn `useEffect` thì có — và lần render đó sẽ nháy
   * qua màn "hết thẻ".
   */
  const [queue, setQueue] = useState<ReviewItem[]>(items)
  const [loadedItems, setLoadedItems] = useState(items)

  if (loadedItems !== items) {
    setLoadedItems(items)
    setQueue(items)
  }

  if (session.isPending) {
    return (
      <div aria-busy className="space-y-4">
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-56 w-full rounded-hero" />
        <Skeleton className="h-14 w-full" />
      </div>
    )
  }

  if (session.isError) {
    const offline = session.error instanceof ApiError && session.error.isNetworkError

    return (
      <EmptyState
        title={offline ? 'Đang ngoại tuyến' : 'Không tải được phiên ôn'}
        // Ôn tập cần ghi kết quả lên server, nên nó KHÔNG chạy offline được.
        // Nói thẳng thay vì để người dùng làm xong rồi mất sạch.
        description={
          offline
            ? 'Ôn tập cần kết nối để lưu kết quả. Kho từ đã lưu vẫn xem được khi ngoại tuyến.'
            : 'Thử lại giúp mình nhé.'
        }
        action={<Button onClick={() => void session.refetch()}>Thử lại</Button>}
      />
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Chưa có từ nào tới hạn ôn."
        description="Quay lại sau nhé — hoặc lưu thêm từ mới để bắt đầu học. 🌸"
        action={<Button onClick={() => void navigate('/vocabulary')}>Về kho từ</Button>}
      />
    )
  }

  if (finished) {
    return (
      <SessionSummary
        result={done}
        onReviewWrong={() => void session.refetch()}
        onGoVocabulary={() => void navigate('/vocabulary')}
      />
    )
  }

  const current = queue[0]

  if (!current) {
    return <Skeleton className="h-56 w-full" />
  }

  function handleSubmit(answer: { answerWordId?: number; text?: string }) {
    if (!current) return

    /*
     * `is_retry` = thẻ này đã nộp ít nhất một lần TRONG PHIÊN NÀY.
     *
     * Thiếu cờ này thì sai-rồi-sửa cho ra cùng lịch như đúng-ngay-lần-đầu (hình
     * phạt SRS bị xóa sạch), và tỉ lệ nhớ tụt theo đúng mức độ chăm chỉ của
     * người dùng — càng sửa lỗi càng bị báo kém (P14, red team H3).
     */
    const isRetry = store.isRetry(current.user_word_id)

    submit.mutate(
      {
        user_word_id: current.user_word_id,
        mode,
        answer_word_id: answer.answerWordId,
        answer: answer.text,
        is_retry: isRetry,
      },
      {
        onSuccess: (result) => {
          setFeedback(result)
          store.markAnswered(current.user_word_id)

          // Chỉ lượt ĐẦU mới tính vào điểm tổng kết — khớp với cách P16 tính
          // tỉ lệ nhớ, để hai con số không mâu thuẫn nhau.
          if (!isRetry) {
            setDone((previous) => ({
              correct: previous.correct + (result.correct ? 1 : 0),
              total: previous.total + 1,
              wrong: result.correct ? previous.wrong : [...previous.wrong, result.correct_answer],
            }))
          }
        },
      },
    )
  }

  function handleContinue() {
    if (!current) return

    const wasCorrect = feedback?.correct ?? false

    setFeedback(null)
    setTyped('')
    setSelected(null)

    setQueue((previous) => {
      const [head, ...rest] = previous

      if (!head) return rest

      // Sai thì đẩy lại CUỐI hàng đợi — gặp lại trong cùng phiên là cách học,
      // và lần nộp sau sẽ mang `is_retry: true`.
      const next = wasCorrect ? rest : [...rest, head]

      if (next.length === 0) setFinished(true)

      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <ReviewProgress current={done.total} total={items.length} />
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>
          Đổi chế độ
        </Button>
      </div>

      {feedback ? (
        <AnswerFeedback
          result={feedback}
          // Định nghĩa tiếng Anh đi kèm: âm Hán-Việt không phải nghĩa, và đây là
          // lúc người học chú ý nhất.
          definitions={[]}
          onContinue={handleContinue}
        />
      ) : isMcqItem(current) ? (
        <McqCard
          item={current}
          disabled={submit.isPending}
          selectedWordId={selected}
          onSelect={(wordId) => {
            setSelected(wordId)
            handleSubmit({ answerWordId: wordId })
          }}
        />
      ) : (
        <TypingCard
          item={current}
          value={typed}
          disabled={submit.isPending}
          onChange={setTyped}
          onSubmit={() => handleSubmit({ text: typed })}
        />
      )}
    </div>
  )
}
