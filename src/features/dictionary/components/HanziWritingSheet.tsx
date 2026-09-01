import { useReducedMotion } from 'motion/react'
import { lazy, Suspense } from 'react'
import { FeatureErrorBoundary } from '@/components/common/FeatureErrorBoundary'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDisplay } from '@/stores/display'
import { useCharacterStrokes } from '../hooks'

/*
 * `React.lazy`: toàn bộ `hanzi-writer` nằm trong chunk này và chỉ tải khi người
 * dùng bấm nút. Cùng lý do với font CJK ở P18 và `HandwritingPad` ở P19 —
 * không bắt mọi người trả phí tải cho một tính năng ngoài đường chính.
 */
const HanziWritingPad = lazy(() =>
  import('./HanziWritingPad').then((m) => ({ default: m.HanziWritingPad })),
)

/**
 * Bảng tập viết một chữ Hán, mở từ thẻ Hán tự.
 *
 * `BottomSheet` chứ không modal mới: màn này mobile-first, và bảng vẽ cần chiều
 * cao lớn mà không làm mất ngữ cảnh trang bên dưới.
 */
export function HanziWritingSheet({
  char,
  open,
  onClose,
}: {
  char: string
  open: boolean
  onClose: () => void
}) {
  /*
   * `enabled: open` là BẮT BUỘC, không phải tối ưu.
   *
   * Thiếu nó thì mọi thẻ chữ trên màn tải ~4 KB hình học ngay khi render — đúng
   * cái mà việc tách endpoint `strokes` khỏi metadata vừa loại bỏ. Một từ 4 chữ
   * sẽ lại là 4 request và 16 KB cho một tính năng thiểu số dùng.
   */
  const { data, isPending, isError } = useCharacterStrokes(char, { enabled: open })

  /*
   * HAI nguồn giảm chuyển động, không phải một:
   *
   *   useDisplay(s => s.motion)  — lựa chọn của người dùng ở /account/settings
   *   useReducedMotion()         — cài đặt hệ điều hành
   *
   * Tiền lệ: `HandwritingPad.tsx` đọc `useDisplay`, `BottomSheet.tsx` đọc
   * `useReducedMotion`. Ở đây cần cả hai vì `hanzi-writer` vẽ bằng JS và không
   * đi qua block CSS đang tự tắt mọi hoạt hình khác trong app.
   */
  const motion = useDisplay((state) => state.motion)
  const systemReduced = useReducedMotion()
  const reduceMotion = motion === 'reduced' || systemReduced === true

  return (
    <BottomSheet open={open} onClose={onClose} title={`Tập viết ${char}`}>
      {isPending && <Skeleton className="mx-auto size-65" />}

      {/*
        Ba ca, ba câu trả lời khác nhau.

        `isError` là lỗi THẬT (mất mạng, 500) — `fetchCharacterStrokes` đã đổi
        404 thành `data: null`, nên hai ca này không lẫn vào nhau. Nói "chữ này
        không có nét" khi thật ra mất mạng là nói dối người dùng.
      */}
      {isError && (
        <p className="text-body text-text-secondary py-8 text-center">
          Cần kết nối để tải nét của chữ này. Chữ đã xem một lần thì tập viết được cả khi ngoại
          tuyến.
        </p>
      )}

      {!isPending && !isError && data === null && (
        <p className="text-body text-text-secondary py-8 text-center">
          Chữ này chưa có dữ liệu nét để tập viết.
        </p>
      )}

      {data != null && (
        /*
         * Error boundary bọc NGOÀI `Suspense`, không phải trong: nó phải bắt
         * được cả ca chunk lười tải hỏng (mạng chập, deploy mới dọn file cũ),
         * và ca đó ném ở chính ranh giới `lazy()`.
         *
         * Một `try/catch` bên trong pad không với tới được nó — đó là lý do
         * bản đầu của phase này giải sai.
         */
        <FeatureErrorBoundary
          fallback={
            <p className="text-body text-text-secondary py-8 text-center">
              Không mở được bảng tập viết. Bạn vẫn xem được thứ tự nét ở dòng "Nét bút".
            </p>
          }
        >
          <Suspense fallback={<Skeleton className="mx-auto size-65" />}>
            <HanziWritingPad data={data} reduceMotion={reduceMotion} />
          </Suspense>
        </FeatureErrorBoundary>
      )}

      {/*
        Ghi công theo Arphic Public License — nghĩa vụ của bộ dữ liệu nét, không
        phải chi tiết trang trí. Cùng khuôn mà dòng Tatoeba và Pixabay đang giữ:
        nhỏ và quiet, nhưng phải có mặt, và đặt đúng nơi dữ liệu được dùng.
      */}
      <p className="text-caption text-text-secondary mt-4 text-center">
        Dữ liệu nét:{' '}
        <a
          href="https://github.com/skishore/makemeahanzi"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Make Me a Hanzi
        </a>{' '}
        · Arphic Public License
      </p>
    </BottomSheet>
  )
}
