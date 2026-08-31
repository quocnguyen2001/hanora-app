import { AudioButton } from '@/components/common/AudioButton'
import { HanziText } from '@/components/common/HanziText'
import { Pinyin } from '@/components/common/Pinyin'
import { CheckIcon, CloseIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { useSpeech } from '@/hooks/use-speech'
import { cn } from '@/lib/cn'
import type { AnswerResult } from '../api'

/**
 * Phản hồi đúng/sai.
 *
 * **ICON là bắt buộc, không chỉ đổi màu.** Khoảng 8% nam giới mù màu đỏ-lục, và
 * xanh-nhạt vs hồng-nhạt là đúng cặp màu họ không phân biệt được. Icon check/x
 * cộng chữ "Chính xác"/"Chưa đúng" khiến kết quả đọc được mà không cần màu.
 *
 * Hiển thị đủ chữ Hán, pinyin, âm Hán-Việt VÀ định nghĩa tiếng Anh: âm Hán-Việt
 * không phải nghĩa (`东西` → `đông tây`), nên bỏ tiếng Anh đi là dạy sai đúng
 * lúc người học đang chú ý nhất.
 */
export function AnswerFeedback({
  result,
  definitions,
  onContinue,
}: {
  result: AnswerResult
  definitions: string[]
  onContinue: () => void
}) {
  const speech = useSpeech()
  const answer = result.correct_answer

  return (
    <section
      // `role="status"` để screen reader đọc kết quả ngay khi nó xuất hiện.
      role="status"
      aria-live="polite"
      className={cn(
        // Animate bằng CSS chứ không trì hoãn mount: khối này là `aria-live`,
        // nội dung phải có mặt trong DOM ngay để screen reader đọc đúng lúc.
        'rounded-card-lg space-y-3 border p-4',
        // Gờ dày theo màu kết quả: khối này là khoảnh khắc quan trọng nhất của
        // phiên ôn, và nó phải đứng hẳn ra khỏi mặt phẳng của những thẻ còn lại.
        'chunky',
        /*
         * HAI hiệu ứng vào khác nhau, và khác biệt đó chính là phản hồi.
         *
         * Đúng  → `pop`, nảy ra từ nhỏ. Ăn mừng.
         * Sai   → `nudge`, lắc ngang. Cảm giác "hụt" mà không trách móc.
         *
         * `ux-rules.md` cấm "bouncing everything", và đây là một trong đúng ba
         * chỗ trong app được phép nảy (xem `--ease-bounce`). Nó xứng đáng vì
         * đây là lúc người học đang chú ý nhất trong cả phiên.
         */
        result.correct
          ? 'animate-pop border-success/40 bg-success/10 chunky-success'
          : 'animate-nudge border-error/40 bg-error/10 chunky-error',
      )}
    >
      {/*
        Icon nằm trong một đĩa tròn tô nền, không đứng trần cạnh chữ.
        Ở cỡ 20px trên nền `success/10` nhạt, một dấu check trần đọc ra là biểu
        tượng trang trí; cùng dấu đó đặt giữa một đĩa đặc thì nó thành con dấu
        đóng lên kết quả. Màu VẪN chỉ là lớp thứ hai — hình dạng check/x cộng
        chữ "Chính xác"/"Chưa đúng" mới là thứ mang nghĩa.
      */}
      <p className="text-title flex items-center gap-2.5">
        <span
          aria-hidden
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            'text-surface',
            result.correct ? 'bg-success-solid' : 'bg-error-solid',
          )}
        >
          {result.correct ? <CheckIcon size={22} /> : <CloseIcon size={22} />}
        </span>
        <span className={result.correct ? 'text-success' : 'text-error'}>
          {result.correct ? 'Chính xác' : 'Chưa đúng'}
        </span>
      </p>

      <div className="flex items-center gap-3">
        <HanziText size="title">{answer.simplified}</HanziText>
        <div className="flex-1">
          <Pinyin className="text-body">{answer.pinyin}</Pinyin>
          {answer.han_viet && <p className="text-body text-text-primary">{answer.han_viet}</p>}
        </div>
        <AudioButton state={speech.state} onPlay={() => speech.play(answer.simplified)} size="sm" />
      </div>

      {definitions.length > 0 && (
        <p className="text-body text-text-secondary">{definitions.join('; ')}</p>
      )}

      <Button size="lg" fullWidth onClick={onContinue} autoFocus>
        Tiếp tục
      </Button>
    </section>
  )
}
