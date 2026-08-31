import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { TopicLearnSkeleton } from '@/components/ui/PageSkeleton'
import { useSavedWordIds } from '@/features/vocabulary/hooks'
import { ApiError } from '@/lib/api'
import type { TopicWord } from '../api'
import { TopicSessionSummary } from '../components/TopicSessionSummary'
import { TopicWordCard } from '../components/TopicWordCard'
import {
  useFinishTopicSession,
  useSaveTopicWord,
  useSkippedWordIds,
  useSkipTopicWord,
  useTopics,
  useTopicWords,
} from '../hooks'
import { pickSession, remainingCount } from '../pick-session'

/**
 * Màn học thẻ của một chủ đề.
 *
 * Bốc bộ thẻ trong EVENT HANDLER (nút "Bắt đầu"), không phải trong `useState`
 * khởi tạo lười: initializer chạy ở render ĐẦU TIÊN, khi cả ba query còn
 * `pending`, nên nó sẽ bốc từ mảng rỗng và rơi thẳng vào màn "đã học hết".
 * `ReviewPage` giải đúng bài này bằng `ModePicker` + `begin()`; ở đây nút "Bắt
 * đầu" đóng cùng vai trò, và tiện thể cho người dùng biết họ sắp học gì.
 */
export function TopicLearnPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()

  const words = useTopicWords(slug)
  const saved = useSavedWordIds()
  const skipped = useSkippedWordIds()
  const topics = useTopics()

  const save = useSaveTopicWord()
  const skip = useSkipTopicWord()
  const finishSession = useFinishTopicSession()

  const [session, setSession] = useState<TopicWord[] | null>(null)
  const [index, setIndex] = useState(0)
  const [savedCount, setSavedCount] = useState(0)
  /*
   * Phiên này đã làm chuỗi ngày tăng chưa.
   *
   * Cờ do SERVER trả trong response của lượt lưu vượt mốc — client không tự suy
   * được, và giữ nó ở đây (không ở component tổng kết) vì tổng kết chỉ mount
   * sau khi phiên đã xong.
   */
  const [streak, setStreak] = useState<{ current: number; advanced: boolean } | undefined>()
  const [skippedCount, setSkippedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [continuing, setContinuing] = useState(false)

  const ready = words.isSuccess && saved.isSuccess && skipped.isSuccess
  const topic = topics.data?.find((item) => item.slug === slug) ?? null

  const remaining = ready ? remainingCount(words.data.words, saved.data, skipped.data) : 0

  function begin(): void {
    // Chỉ bốc khi CẢ BA query đã có dữ liệu. Đây là điều kiện mà `useState`
    // khởi tạo lười không thể chờ được.
    if (!ready) return

    setSession(
      pickSession({ words: words.data.words, savedIds: saved.data, skippedIds: skipped.data }),
    )
    setIndex(0)
    setSavedCount(0)
    setSkippedCount(0)
    /*
     * Reset cùng chỗ với ba bộ đếm kia, không phải chi tiết thừa: người dùng
     * bấm "Học tiếp chủ đề này" sau khi chuỗi đã tăng ở phiên trước sẽ được
     * chúc mừng LẦN NỮA cho một phiên không làm chuỗi nhích. Màn ôn tập miễn
     * nhiễm vì nó đọc `finish.data` của từng mutation; màn này giữ state nên nó
     * phải tự dọn.
     */
    setStreak(undefined)
    setError(null)
  }

  function advance(): void {
    setError(null)
    setIndex((current) => current + 1)
  }

  function handleSave(word: TopicWord): void {
    setError(null)
    save.mutate(word.id, {
      onSuccess: ({ streak }) => {
        setSavedCount((count) => count + 1)
        if (streak?.advanced === true) setStreak({ current: streak.current, advanced: true })
        advance()
      },
      // Thẻ ĐỨNG YÊN khi lỗi. Nhảy thẻ rồi báo lỗi sau là để người dùng học hết
      // phiên, thấy "đã thêm 6 từ", rồi vào `/review` không thấy gì.
      onError: (cause) => setError(messageFor(cause, 'Chưa lưu được từ này.')),
    })
  }

  function handleSkip(word: TopicWord): void {
    setError(null)
    skip.mutate(word.id, {
      onSuccess: () => {
        setSkippedCount((count) => count + 1)
        advance()
      },
      onError: (cause) => setError(messageFor(cause, 'Chưa bỏ qua được từ này.')),
    })
  }

  async function handleContinue(): Promise<void> {
    setContinuing(true)

    /*
     * `await` TRƯỚC khi bốc bộ mới.
     *
     * `invalidateQueries` bất đồng bộ và trả `data` cũ trong lúc refetch
     * (`useSavedWordIds` có `staleTime: 30s`). Bốc ngay sau khi invalidate sẽ
     * phát lại ĐÚNG 10 từ vừa học.
     */
    await finishSession()

    const [freshWords, freshSaved, freshSkipped] = await Promise.all([
      words.refetch(),
      saved.refetch(),
      skipped.refetch(),
    ])

    setContinuing(false)

    if (!freshWords.data || !freshSaved.data || !freshSkipped.data) return

    setSession(
      pickSession({
        words: freshWords.data.words,
        savedIds: freshSaved.data,
        skippedIds: freshSkipped.data,
      }),
    )
    setIndex(0)
    setSavedCount(0)
    setSkippedCount(0)
    // Cùng lý do như trong `begin()`: cờ chúc mừng là state của TRANG, và đây là
    // đường thứ hai mở một phiên mới. Quên chỗ này thì "Học tiếp chủ đề này"
    // chúc mừng lại cho một phiên không làm chuỗi nhích.
    setStreak(undefined)
  }

  async function goReview(): Promise<void> {
    await finishSession()
    void navigate('/review')
  }

  async function goTopics(): Promise<void> {
    await finishSession()
    void navigate('/topics')
  }

  if (words.isPending || saved.isPending || skipped.isPending) {
    return (
      <div aria-busy>
        <TopicLearnSkeleton />
      </div>
    )
  }

  if (words.isError) {
    const offline = words.error instanceof ApiError && words.error.isNetworkError

    return (
      <EmptyState
        title={offline ? 'Đang ngoại tuyến' : 'Không tải được chủ đề'}
        description={
          offline
            ? 'Học từ mới cần kết nối để lưu từ vào kho.'
            : 'Chủ đề này có thể không còn tồn tại.'
        }
        action={<Button onClick={() => void navigate('/topics')}>Về danh sách chủ đề</Button>}
      />
    )
  }

  // Ba màn kết thúc, ba câu khác nhau — gộp lại là lặp đúng lỗi mà
  // `EmptySession` của màn Ôn tập đã cẩn thận tránh.
  if (session === null && remaining === 0) {
    return (
      <EmptyState
        title="Bạn đã học hết chủ đề này 🎉"
        description="Quay lại sau nhé — hoặc chọn một chủ đề khác để học tiếp."
        action={<Button onClick={() => void navigate('/topics')}>Chọn chủ đề khác</Button>}
      />
    )
  }

  if (session === null) {
    return (
      <div className="space-y-4">
        <h1 className="text-title">{topic?.name ?? 'Chủ đề'}</h1>

        <Card size="hero" className="space-y-3 text-center">
          <p aria-hidden className="text-[2.5rem] leading-none">
            {topic?.emoji ?? '📘'}
          </p>
          <p className="text-body text-text-secondary">
            Còn <strong className="text-text-primary">{remaining}</strong> từ bạn chưa học.
          </p>
          <Button className="w-full" onClick={begin}>
            Bắt đầu học
          </Button>
        </Card>
      </div>
    )
  }

  if (index >= session.length) {
    return (
      <TopicSessionSummary
        streak={streak}
        saved={savedCount}
        skipped={skippedCount}
        hasMore={remaining - session.length > 0}
        onReview={() => void goReview()}
        onContinue={() => void handleContinue()}
        onBack={() => void goTopics()}
        continuing={continuing}
      />
    )
  }

  const word = session[index] as TopicWord
  const pending = save.isPending || skip.isPending

  return (
    <TopicWordCard
      // `key` theo id từ: hai thẻ liên tiếp phải là hai instance khác nhau, nếu
      // không trạng thái ảnh của thẻ trước rò sang thẻ sau.
      key={word.id}
      word={word}
      position={index + 1}
      total={session.length}
      onSave={() => handleSave(word)}
      onSkip={() => handleSkip(word)}
      onUndoSkip={null}
      pending={pending}
      error={error}
    />
  )
}

function messageFor(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError && cause.isNetworkError) {
    return 'Đang ngoại tuyến — chưa lưu được. Thử lại khi có mạng nhé.'
  }

  return fallback
}
