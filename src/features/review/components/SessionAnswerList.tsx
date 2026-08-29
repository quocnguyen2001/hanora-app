import { HanziText } from '@/components/common/HanziText'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { formatDuration } from '../duration'
import type { ReviewAnswer } from '../history-api'

/**
 * Danh sách từng lượt trả lời trong một phiên.
 *
 * Dùng ở CẢ màn tổng kết ngay sau khi ôn lẫn trang chi tiết phiên trong lịch
 * sử. Một component vì đó là cùng một dữ liệu: hai bản render riêng sẽ trôi
 * khỏi nhau và cho ra hai câu chuyện khác nhau về cùng một phiên.
 */
export function SessionAnswerList({
  answers,
  onSelectWord,
}: {
  answers: ReviewAnswer[]
  onSelectWord: (wordId: number) => void
}) {
  return (
    <ol className="space-y-2">
      {answers.map((answer, index) => (
        <li key={answer.id}>
          <button
            type="button"
            onClick={() => onSelectWord(answer.word.id)}
            className={cn(
              'hover:bg-primary-pale rounded-control flex w-full items-start gap-3 p-2 text-left',
              'duration-press ease-soft transition active:scale-[0.99]',
              /*
               * Lượt LÀM LẠI nhạt hơn.
               *
               * Chúng không tính vào điểm, nên hiện ngang hàng sẽ khiến người
               * dùng tự cộng ra một con số khác với điểm ở ngay phía trên.
               */
              answer.is_retry && 'opacity-60',
            )}
          >
            <span className="text-caption text-text-secondary w-5 shrink-0 pt-1 text-right">
              {index + 1}
            </span>

            {/* `role="img"` để `aria-label` hợp lệ: role ngầm `generic` của
                `span` cấm đặt tên khả truy cập. */}
            <span
              role="img"
              aria-label={answer.is_correct ? 'Đúng' : 'Sai'}
              className={cn(
                'text-body w-4 shrink-0 pt-0.5 text-center',
                answer.is_correct ? 'text-success' : 'text-error',
              )}
            >
              {answer.is_correct ? '✓' : '✕'}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-2">
                <HanziText size="inline">{answer.word.simplified}</HanziText>
                <span className="text-body text-text-secondary">{answer.word.pinyin}</span>
                {answer.word.han_viet && (
                  <span className="text-body text-text-primary">{answer.word.han_viet}</span>
                )}
              </span>

              {/*
                Câu SAI hiện thứ người dùng đã nhập, gạch ngang, cạnh đáp án
                đúng ở trên. Không có nó thì họ chỉ biết mình sai chứ không biết
                sai ở đâu — và với mode gõ, sai một dấu thanh khác hẳn sai cả từ.

                Chỉ ở mode gõ: ở trắc nghiệm `answer_raw` là một `word_id`.
              */}
              {!answer.is_correct && answer.mode === 'typing' && answer.answer_raw && (
                <span className="text-caption text-text-secondary mt-0.5 block">
                  Bạn nhập: <span className="text-error line-through">{answer.answer_raw}</span>
                </span>
              )}
            </span>

            <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
              {answer.duration_ms !== null && (
                <span className="text-caption text-text-secondary tabular-nums">
                  {formatDuration(answer.duration_ms)}
                </span>
              )}
              {answer.is_retry && <Badge>làm lại</Badge>}
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}
