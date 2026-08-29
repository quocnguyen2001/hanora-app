import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ReviewSkeleton } from '@/components/ui/PageSkeleton'
import { ApiError } from '@/lib/api'
import {
  isMcqItem,
  type AnswerResult,
  type EmptyReason,
  type ReviewItem,
  type ReviewSessionMeta,
  type StartedSession,
} from '../api'
import { AnswerFeedback } from '../components/AnswerFeedback'
import { McqCard } from '../components/McqCard'
import { ModePicker, type SessionConfig } from '../components/ModePicker'
import { ReviewProgress } from '../components/ReviewProgress'
import { SessionSummary } from '../components/SessionSummary'
import { TypingCard } from '../components/TypingCard'
import type { SessionDetail } from '../history-api'
import { useFinishSession, useStartSession, useSubmitAnswer } from '../hooks'

export function ReviewPage() {
  const navigate = useNavigate()
  const start = useStartSession()
  const [started, setStarted] = useState<StartedSession | null>(null)

  function begin(config: SessionConfig) {
    /*
     * `useMutation` KHÔNG dedupe như `useQuery`.
     *
     * Bấm kép trên mạng chậm sẽ bắn hai `POST /reviews/sessions`, và hậu quả
     * thường không phải hai phiên: phiên B chốt phiên A trong khi app giữ id
     * của A, rồi mọi lượt nộp sau đó trả 409. Cờ `isPending` chặn cửa đó.
     */
    if (start.isPending) return

    start.mutate(config, { onSuccess: setStarted })
  }

  if (start.isPending) {
    return (
      <div aria-busy>
        <ReviewSkeleton />
      </div>
    )
  }

  if (start.isError) {
    const offline = start.error instanceof ApiError && start.error.isNetworkError

    return (
      <EmptyState
        title={offline ? 'Đang ngoại tuyến' : 'Không mở được phiên ôn'}
        // Ôn tập cần ghi kết quả lên server, nên nó KHÔNG chạy offline được.
        // Nói thẳng thay vì để người dùng làm xong rồi mất sạch.
        description={
          offline
            ? 'Ôn tập cần kết nối để lưu kết quả. Kho từ đã lưu vẫn xem được khi ngoại tuyến.'
            : 'Thử lại giúp mình nhé.'
        }
        action={<Button onClick={() => start.reset()}>Thử lại</Button>}
      />
    )
  }

  if (started === null) {
    return <ModePicker onStart={begin} />
  }

  if (started.session === null) {
    return <EmptySession reason={started.empty_reason} onBack={() => setStarted(null)} />
  }

  /*
   * `key={session.id}` chứ không `key={mode}`.
   *
   * Hai phiên liên tiếp CÙNG mode là chuyện bình thường — bấm "Ôn lại từ sai"
   * là đúng trường hợp đó. Khoá theo mode sẽ tái dùng component instance cũ và
   * rò hàng đợi của phiên trước sang phiên mới.
   */
  return (
    <ReviewSession
      key={started.session.id}
      session={started.session}
      items={started.items}
      onExit={() => setStarted(null)}
      onRestart={(config) => {
        setStarted(null)
        begin(config)
      }}
      onGoHistory={() => void navigate('/review/history')}
      onGoVocabulary={() => void navigate('/vocabulary')}
      onSelectWord={(wordId) => void navigate(`/words/${wordId}`)}
    />
  )
}

/**
 * Hai lý do rỗng, hai câu trả lời.
 *
 * Gộp chúng lại sẽ khiến người dùng có đầy từ hay sai đọc được câu "Chưa có từ
 * nào bạn từng sai" trong khi trang Thống kê đang hiện đúng những từ đó.
 */
function EmptySession({ reason, onBack }: { reason: EmptyReason | null; onBack: () => void }) {
  if (reason === 'not_enough_options') {
    return (
      <EmptyState
        title="Chưa dựng được câu trắc nghiệm."
        description="Kho từ chưa đủ để tạo 4 lựa chọn khác nhau. Thử chế độ Gõ lại, hoặc lưu thêm vài từ nữa."
        action={<Button onClick={onBack}>Đổi chế độ</Button>}
      />
    )
  }

  return (
    <EmptyState
      title="Chưa có từ nào để ôn."
      description="Quay lại sau nhé — hoặc lưu thêm từ mới để bắt đầu học. 🌸"
      action={<Button onClick={onBack}>Chọn lại</Button>}
    />
  )
}

function ReviewSession({
  session,
  items,
  onExit,
  onRestart,
  onGoHistory,
  onGoVocabulary,
  onSelectWord,
}: {
  session: ReviewSessionMeta
  items: ReviewItem[]
  onExit: () => void
  onRestart: (config: SessionConfig) => void
  onGoHistory: () => void
  onGoVocabulary: () => void
  onSelectWord: (wordId: number) => void
}) {
  const submit = useSubmitAnswer()
  const finish = useFinishSession()

  const [queue, setQueue] = useState<ReviewItem[]>(items)
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const [typed, setTyped] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<SessionDetail | null>(null)
  const [answeredCount, setAnsweredCount] = useState(session.answered_count)

  /*
   * Mốc bắt đầu của thẻ đang hiện, để đo thời gian trả lời.
   *
   * `useRef` chứ không `useState`: đây không phải dữ liệu để render, và đặt nó
   * vào state sẽ kích hoạt một lượt render thừa mỗi lần sang thẻ mới.
   *
   * Đặt lại ở `handleContinue` (sang thẻ kế) chứ không ở render — đọc `Date.now()`
   * lúc render là một side effect, và StrictMode render hai lần.
   */
  const shownAt = useRef(Date.now())

  const current = queue[0]

  if (outcome) {
    return (
      <SessionSummary
        outcome={outcome}
        onReviewWrong={() =>
          onRestart({ mode: session.mode, source: 'weak', limit: session.planned_count })
        }
        onGoHistory={onGoHistory}
        onGoVocabulary={onGoVocabulary}
        onSelectWord={onSelectWord}
      />
    )
  }

  /*
   * Phiên đã chốt dưới chân client (409).
   *
   * Xảy ra khi người dùng mở phiên mới ở tab/thiết bị khác — server tự chốt
   * phiên cũ. Nói thẳng và cho lối đi, chứ không im lặng: lượt vừa nộp KHÔNG
   * được ghi.
   */
  if (submit.error instanceof ApiError && submit.error.status === 409) {
    return (
      <EmptyState
        title="Phiên ôn này đã kết thúc."
        description="Có vẻ bạn đã mở một phiên khác ở nơi khác. Bắt đầu lại nhé."
        action={<Button onClick={onExit}>Bắt đầu phiên mới</Button>}
      />
    )
  }

  /*
   * MỌI lỗi nộp bài khác, không riêng 409.
   *
   * Không có nhánh này thì thẻ mở khoá lại sau khi mutation reject và không có
   * gì xảy ra: người dùng bấm đáp án rồi màn hình đứng im. Mất mạng giữa phiên
   * là kịch bản thường gặp nhất — `lib/api.ts` chặn thẳng thao tác ghi khi
   * `navigator.onLine` là `false`, nên nó tới đây dưới dạng `ApiError` status 0.
   */
  if (submit.isError) {
    const offline = submit.error instanceof ApiError && submit.error.isNetworkError

    return (
      <EmptyState
        title={offline ? 'Mất kết nối giữa phiên' : 'Không gửi được câu trả lời'}
        description={
          offline
            ? 'Những câu đã trả lời trước đó vẫn được lưu. Có mạng lại thì thử tiếp nhé.'
            : 'Những câu đã trả lời trước đó vẫn được lưu.'
        }
        action={
          <div className="w-full space-y-2">
            <Button fullWidth onClick={() => submit.reset()}>
              Thử lại câu này
            </Button>
            <Button variant="secondary" fullWidth onClick={finishNow}>
              Kết thúc phiên
            </Button>
          </div>
        }
      />
    )
  }

  /*
   * Không chốt được phiên.
   *
   * Không có nhánh này thì hàng đợi rỗng + `outcome` null rơi vào khung xương
   * bên dưới và đứng đó VĨNH VIỄN — không thông báo, không nút. Điểm thật ra
   * vẫn an toàn trên server (bộ đếm cập nhật từng lượt), người dùng chỉ không
   * biết.
   */
  if (finish.isError) {
    return (
      <EmptyState
        title="Không chốt được phiên"
        description="Kết quả từng câu đã được lưu rồi. Thử chốt lại, hoặc xem trong lịch sử ôn tập."
        action={
          <div className="w-full space-y-2">
            <Button fullWidth onClick={() => finishNow()}>
              Thử lại
            </Button>
            <Button variant="secondary" fullWidth onClick={onGoHistory}>
              Xem lịch sử ôn tập
            </Button>
          </div>
        }
      />
    )
  }

  if (!current) {
    return (
      <div aria-busy>
        <ReviewSkeleton />
      </div>
    )
  }

  function finishNow() {
    // Cửa thứ hai bên cạnh việc updater đã thuần: `finish` idempotent ở server
    // nên bấm "Thử lại" luôn an toàn, nhưng không nên bắn trùng ngay từ đầu.
    if (finish.isPending) return

    finish.mutate(session.id, { onSuccess: setOutcome })
  }

  function handleSubmit(answer: { answerWordId?: number; text?: string }) {
    if (!current) return

    submit.mutate(
      {
        user_word_id: current.user_word_id,
        review_session_id: session.id,
        mode: session.mode,
        answer_word_id: answer.answerWordId,
        answer: answer.text,
        // Kẹp trần 1 giờ khớp với validate ở server: tab bị bỏ quên qua đêm
        // không được làm hỏng cả lượt nộp bằng một lỗi 422.
        duration_ms: Math.min(Date.now() - shownAt.current, 3_600_000),
        // KHÔNG gửi `is_retry`: server suy nó từ log của phiên.
      },
      {
        onSuccess: (result) => {
          setFeedback(result)
          // Tiến độ đến từ server — một nguồn sự thật, không cộng lại ở client.
          setAnsweredCount(result.session.answered_count)
        },
      },
    )
  }

  function handleContinue() {
    if (!current) return

    const wasCorrect = feedback?.correct ?? false
    const [head, ...rest] = queue

    /*
     * Hàng đợi mới tính THUẦN ở đây, không trong updater của `setQueue`.
     *
     * Updater của `useState` bắt buộc phải thuần: StrictMode gọi nó hai lần ở
     * dev đúng để lộ loại lỗi này, và React được phép chạy lại nó bất cứ lúc
     * nào một lượt render bị bỏ đi. Gọi `finishNow()` bên trong nghĩa là mỗi
     * phiên kết thúc bắn hai `POST .../finish`.
     */
    // Sai thì đẩy lại CUỐI hàng đợi — gặp lại trong cùng phiên là cách học, và
    // lượt nộp sau sẽ được server đánh dấu là làm lại.
    const next = wasCorrect || !head ? rest : [...rest, head]

    setFeedback(null)
    setTyped('')
    setSelected(null)
    setQueue(next)
    shownAt.current = Date.now()

    if (next.length === 0) finishNow()
  }

  return (
    // `animate-rise`: nhánh này mount mới, nên nội dung tan vào đúng chỗ khung
    // xương vừa đứng thay vì bị cắt cứng.
    <div className="animate-rise space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <ReviewProgress current={answeredCount} total={session.planned_count} />
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
