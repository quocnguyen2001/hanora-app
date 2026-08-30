import { useNavigate, useSearchParams } from 'react-router'
import { AudioButton } from '@/components/common/AudioButton'
import { HanziText } from '@/components/common/HanziText'
import { Pinyin } from '@/components/common/Pinyin'
import { ChevronLeftIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { SentenceDetailSkeleton } from '@/components/ui/PageSkeleton'
import { useSpeech } from '@/hooks/use-speech'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { SentenceToken } from '@/types/dictionary'
import { useSentence } from '../hooks'

/**
 * Chi tiết một CÂU tiếng Trung.
 *
 * Câu đến từ thẻ dịch ở màn tìm kiếm và KHÔNG phải mục từ điển, nên nó không có
 * id để đặt vào path. Khoá là chính chuỗi Hán trong query string — đúng khoá mà
 * API dùng, và nhờ vậy màn tìm kiếm điều hướng được ngay khi bấm thay vì phải
 * gọi API lấy id trước.
 *
 * Trang này KHÔNG có nút lưu vào kho: kho từ lưu theo `word_id`, và câu không có
 * cái đó. Từng từ trong câu thì lưu được — mở trang chi tiết của nó rồi lưu.
 */
export function SentenceDetailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const zh = params.get('zh') ?? ''

  const { data, isPending, isError, error, refetch } = useSentence(zh)
  const speech = useSpeech()

  const back = (
    <IconButton
      label="Quay lại"
      icon={<ChevronLeftIcon size={20} />}
      onClick={() => void navigate(-1)}
    />
  )

  if (zh.trim() === '') {
    return (
      <EmptyState
        title="Thiếu câu cần tra"
        description="Mở trang này từ kết quả tìm kiếm để xem phân tích câu."
        action={<Button onClick={() => void navigate('/search')}>Về tìm kiếm</Button>}
      />
    )
  }

  if (isPending) {
    return (
      <div aria-busy>
        {/*
          Khung xương chứ không phải spinner: phân tích câu mất 3-5 giây lần đầu
          (lần sau đọc cache, ~40ms). Người dùng cần thấy TRANG đang dựng, không
          phải một vòng xoay không nói gì về thứ sắp hiện ra.

          `{back}` truyền vào là nút THẬT, không phải xương: đây là màn chờ lâu
          nhất của app và người dùng phải thoát ra được trong lúc chờ.
        */}
        <SentenceDetailSkeleton back={back} />
      </div>
    )
  }

  if (isError) {
    const offline = error instanceof ApiError && error.isNetworkError

    return (
      <div className="space-y-4">
        {back}
        <EmptyState
          title={offline ? 'Đang ngoại tuyến' : 'Chưa phân tích được câu này'}
          description={
            offline
              ? 'Phân tích câu cần kết nối mạng. Kho từ đã lưu vẫn xem được.'
              : 'Thử lại giúp mình nhé. Phần tra từng từ ở màn tìm kiếm vẫn dùng được.'
          }
          action={<Button onClick={() => void refetch()}>Thử lại</Button>}
        />
      </div>
    )
  }

  return (
    // `animate-rise`: nhánh này mount mới khi `isPending` lật, nên nội dung tan
    // vào đúng chỗ khung xương vừa đứng thay vì bị cắt cứng.
    <div className="animate-rise space-y-4">
      <div className="flex items-center justify-between">
        {back}
        <Badge tone="primary">AI phân tích</Badge>
      </div>

      {/*
        `<h1>` của màn này — `sr-only` vì cùng lý do đã ghi ở `WordDetailPage`:
        chữ Hán trong hero đã giữ thứ bậc thị giác, chỉ thiếu mốc ngữ nghĩa.

        Có tiền tố `Chi tiết câu:` chứ không phải chuỗi Hán trần. Chuỗi trần sẽ
        LẶP nguyên văn câu đang hiện ngay bên dưới: screen reader đọc hai lần,
        và `getByText` không còn phân biệt được hai nút đó nữa.
      */}
      <h1 className="sr-only">Chi tiết câu: {data.zh}</h1>

      <section className="bg-surface shadow-card rounded-hero space-y-2 p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <HanziText size="title" className="break-words">
              {data.zh}
            </HanziText>
            <Pinyin className="block break-words">{data.pinyin}</Pinyin>
          </div>
          <AudioButton state={speech.state} onPlay={() => speech.play(data.zh)} />
        </div>

        <p className="text-body text-text-primary">{data.vi}</p>

        {data.literal_vi && (
          <p className="text-caption text-text-secondary">
            {/*
              Nghĩa đen nghe ngang là ĐÚNG — nó tồn tại để thấy tiếng Trung sắp
              xếp ý khác tiếng Việt ở chỗ nào. Nhãn nói rõ để người học không
              tưởng bản dịch bị dở.
            */}
            <span className="font-medium">Nghĩa đen: </span>
            {data.literal_vi}
          </p>
        )}
      </section>

      {data.tokens.length > 0 && (
        <Card>
          <h2 className="text-section">Từng từ</h2>
          <ul className="mt-3 space-y-2">
            {data.tokens.map((token, index) => (
              <li key={`${token.zh}-${index}`}>
                <TokenRow token={token} onOpen={() => void navigate(`/words/${token.word_id}`)} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.grammar_notes.length > 0 && (
        <Card>
          <h2 className="text-section">Ngữ pháp</h2>
          <ul className="text-body text-text-secondary mt-3 list-disc space-y-2 pl-5">
            {data.grammar_notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-caption text-text-secondary px-1">
        Phân tích do AI tạo — có thể chưa chuẩn. Nghĩa của từng từ tra được trong từ điển.
      </p>
    </div>
  )
}

/**
 * Một từ trong câu.
 *
 * Chỉ RENDER thành nút khi có `word_id`. Dấu câu và những cụm không có trong
 * CC-CEDICT hiện như chữ thường — một hàng trông bấm được mà bấm không ra gì tệ
 * hơn một hàng tĩnh, cùng lý do plan đã cắt tab `Hán tự` khỏi MVP.
 */
function TokenRow({ token, onOpen }: { token: SentenceToken; onOpen: () => void }) {
  const linked = token.word_id !== null

  const content = (
    <>
      <span className="flex items-baseline gap-2">
        <HanziText size="inline">{token.zh}</HanziText>
        {token.pinyin && <Pinyin>{token.pinyin}</Pinyin>}
      </span>
      {token.vi && <span className="text-body text-text-secondary">{token.vi}</span>}
    </>
  )

  if (!linked) {
    return <div className="flex items-center justify-between gap-3 px-1 py-2">{content}</div>
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full items-center justify-between gap-3 px-1 py-2 text-left',
        'rounded-card duration-press ease-soft transition',
        'hover:bg-primary-pale active:bg-primary-soft active:scale-[0.99]',
      )}
    >
      {content}
    </button>
  )
}
