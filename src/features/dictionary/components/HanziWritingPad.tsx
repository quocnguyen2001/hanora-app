import HanziWriter from 'hanzi-writer'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { CharacterStrokes } from '@/types/dictionary'

type Phase = 'demo' | 'quiz' | 'done'

/**
 * Bảng tập viết một chữ Hán.
 *
 * CHUNK LƯỜI — toàn bộ phụ thuộc `hanzi-writer` nằm ở đây và chỉ tải khi người
 * dùng bấm nút. Đo được: gói chính không tăng byte nào vì nó, còn chunk này là
 * 37 kB (11 kB gzip). Cùng lý do `HandwritingPad` của P19 làm vậy.
 *
 * Component THUẦN: nhận `strokes`/`medians` qua props, không tự gọi API.
 *
 * **Không tự bắt lỗi.** Sheet bọc ngoài có error boundary, và nó bắt được CẢ ca
 * chunk tải hỏng — thứ mà một `try/catch` quanh `create()` ở đây không với tới.
 *
 * ## Vì sao không dùng lại `HandwritingPad`
 *
 * Cái kia là NHẬN DẠNG — vẽ tự do rồi hỏi Google Input Tools chữ đó là gì. Nó
 * không biết thứ tự nét chuẩn nên không dạy được thứ tự nét, đúng thứ người
 * đang tập viết cần nhất. Hai tính năng khác nhau.
 */
export function HanziWritingPad({
  data,
  reduceMotion,
}: {
  data: CharacterStrokes
  /**
   * Bỏ hoạt hình xem mẫu và vào thẳng chế độ tô.
   *
   * `hanzi-writer` vẽ bằng JS nên nó KHÔNG đi qua block
   * `animation-duration: 0.01ms` của `app.css` — thứ đang tự động tắt mọi hoạt
   * hình khác trong app. Cờ này là cách duy nhất tôn trọng lựa chọn của người
   * dùng ở đây, và sheet bọc ngoài đọc CẢ hai nguồn để tính nó.
   */
  reduceMotion: boolean
}) {
  const target = useRef<HTMLDivElement>(null)
  const writer = useRef<ReturnType<typeof HanziWriter.create> | null>(null)
  const [phase, setPhase] = useState<Phase>(reduceMotion ? 'quiz' : 'demo')
  const [remaining, setRemaining] = useState(data.strokes.length)

  useEffect(() => {
    const element = target.current

    if (element === null) return

    element.replaceChildren()

    const instance = HanziWriter.create(element, data.char, {
      /*
       * Mặc định `hanzi-writer` tự tải JSON theo chữ từ CDN của nó. KHÔNG dùng
       * đường đó: nó là một lời gọi mạng ra ngoài, nằm ngoài tầm `api.ts`, và
       * không đi qua service worker của app.
       */
      charDataLoader: () => ({ strokes: data.strokes, medians: data.medians }),
      width: 260,
      height: 260,
      padding: 12,
      showCharacter: false,
      showOutline: true,
      // Màu đọc từ token, không phải mã thô — đổi chủ đề thì bảng vẽ đổi theo.
      strokeColor: readToken('--color-primary', '#FF6F91'),
      outlineColor: readToken('--color-border', '#E8E0DC'),
      highlightColor: readToken('--color-success', '#3FB984'),
      drawingColor: readToken('--color-text-primary', '#2B2B2B'),
      showHintAfterMisses: 3,
    })

    writer.current = instance

    return () => {
      instance.cancelQuiz()
      writer.current = null
      element.replaceChildren()
    }
  }, [data])

  useEffect(() => {
    const instance = writer.current

    if (instance === null) return

    if (phase === 'demo') {
      // Hoạt hình chạy TRƯỚC, không phải sau: người chưa biết viết chữ này thì
      // bắt tô ngay là bắt đoán.
      void instance.animateCharacter({ onComplete: () => setPhase('quiz') })

      return
    }

    if (phase === 'quiz') {
      void instance.quiz({
        onCorrectStroke: (event) => setRemaining(event.strokesRemaining),
        onComplete: () => setPhase('done'),
      })
    }
  }, [phase])

  /*
   * Đặt lại bộ đếm ở CHỖ GÂY RA chuyển pha, không phải trong effect.
   *
   * `setRemaining` ngay trong effect là một lần render xếp chồng ngay sau lần
   * vừa xong — `react-hooks/set-state-in-effect` bắt đúng thứ đó. Gộp vào hàm
   * chuyển pha thì cả hai state đổi trong cùng một lần render.
   */
  const startQuiz = () => {
    writer.current?.cancelQuiz()
    setRemaining(data.strokes.length)
    setPhase('quiz')
  }

  const total = data.strokes.length
  const current = Math.min(total - remaining + 1, total)

  return (
    <div className="flex flex-col items-center gap-4">
      {/*
        `touch-none`: kéo trên vùng vẽ không được cuộn trang. Cùng cách mà
        `HandwritingPad` đã giải, không phát minh lại.
      */}
      <div
        ref={target}
        className="bg-primary-pale rounded-card-lg border-border touch-none border"
        aria-hidden
      />

      {/*
        Canvas vẽ nét vô hình với screen reader, nên TRẠNG THÁI phải phát ra
        bằng chữ. Thao tác tô là thị giác-vận động và không thay thế được, nhưng
        tiến độ thì không được im lặng.
      */}
      <p aria-live="polite" className="text-body text-text-secondary min-h-6 text-center">
        {phase === 'demo' && 'Đang xem thứ tự nét…'}
        {phase === 'quiz' && `Nét ${current} trên ${total}`}
        {phase === 'done' && (
          <span className="text-success animate-pop inline-block font-bold">Hoàn thành</span>
        )}
      </p>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            writer.current?.cancelQuiz()
            setRemaining(total)
            setPhase('demo')
          }}
        >
          Xem lại mẫu
        </Button>
        <Button onClick={startQuiz}>Viết lại</Button>
      </div>
    </div>
  )
}

/**
 * Giá trị thật của một biến CSS.
 *
 * `hanzi-writer` vẽ SVG bằng JS và nhận màu là CHUỖI, không nhận `var(--x)`.
 * Đọc token lúc dựng là cách duy nhất để bảng vẽ theo đúng chủ đề đang bật thay
 * vì mang một bảng màu thứ hai.
 */
function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()

  return value === '' ? fallback : value
}
