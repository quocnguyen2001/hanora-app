import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { recognise, type Stroke } from '@/lib/handwriting'
import { useDisplay } from '@/stores/display'

const SIZE = 260

/** Chờ 400ms sau nét cuối rồi mới nhận dạng — vẽ tiếp thì hủy lần trước. */
const IDLE_MS = 400

/**
 * Bảng vẽ chữ Hán.
 *
 * Dùng pointer events chứ không phải touch/mouse riêng: một bộ handler chạy
 * đúng trên cả ngón tay, bút cảm ứng và chuột.
 *
 * Đây là ĐƯỜNG PHỤ để nhập, không phải đường duy nhất — ô nhập bàn phím luôn ở
 * đó. Nên khi engine lỗi, bảng vẽ báo lỗi và người dùng vẫn làm bài được.
 */
export function HandwritingPad({ onPick }: { onPick: (character: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [drawing, setDrawing] = useState(false)
  const [candidates, setCandidates] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle')

  /*
   * Canvas không tự đổi màu theo token — pixel đã vẽ là pixel chết. Nên nét bút
   * phải đọc màu chữ hiện hành và vẽ LẠI mỗi khi chủ đề đổi.
   *
   * Trước đây chỗ này là `strokeStyle = '#29252A'` viết cứng. Ở chế độ tối màu
   * đó gần như trùng nền, và người dùng viết ra một nét vô hình — hỏng im lặng,
   * không báo lỗi, không có đường tự phát hiện.
   */
  const theme = useDisplay((state) => state.theme)
  const textTone = useDisplay((state) => state.textTone)

  // Vẽ lại toàn bộ nét mỗi khi danh sách nét đổi — đơn giản và luôn đúng.
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) return

    context.clearRect(0, 0, SIZE, SIZE)
    context.lineWidth = 6
    context.lineCap = 'round'
    context.lineJoin = 'round'
    // `color` của chính canvas — nó thừa kế `text-text-primary` từ class bên dưới,
    // nên nét bút luôn cùng màu với chữ, ở mọi chủ đề và mọi tông.
    context.strokeStyle = getComputedStyle(canvas).color

    for (const stroke of strokes) {
      context.beginPath()
      stroke.forEach(([x, y], index) => {
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      context.stroke()
    }
    // `theme` và `textTone` nằm trong deps để nét bút được vẽ lại bằng màu mới
    // khi người dùng đổi chủ đề giữa lúc đang viết dở.
  }, [strokes, theme, textTone])

  // Nhận dạng khi người dùng ngừng vẽ.
  useEffect(() => {
    if (drawing || strokes.length === 0) return

    const timer = setTimeout(() => {
      setStatus('working')

      recognise(strokes, SIZE, SIZE)
        .then((result) => {
          setCandidates(result)
          setStatus(result.length === 0 ? 'error' : 'idle')
        })
        .catch(() => setStatus('error'))
    }, IDLE_MS)

    return () => clearTimeout(timer)
  }, [strokes, drawing])

  /*
   * PHẢI gọi ngay trong handler, KHÔNG được gọi bên trong updater của
   * `setStrokes`.
   *
   * React chạy updater một cách trễ — trong lúc render, sau khi handler đã trả
   * về — và lúc đó nó đã đặt `event.currentTarget` về `null`. Đọc `rect` ở đó
   * ném `Cannot read properties of null` và làm sập cả trang ôn tập ngay nét vẽ
   * đầu tiên. Ngoài ra updater phải thuần túy: StrictMode gọi nó hai lần.
   */
  function pointFrom(event: ReactPointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect()

    return [
      Math.round(((event.clientX - rect.left) / rect.width) * SIZE),
      Math.round(((event.clientY - rect.top) / rect.height) * SIZE),
    ]
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        // `touch-none` để kéo trên canvas không cuộn trang.
        className="border-border bg-surface text-text-primary rounded-card w-full max-w-[260px] touch-none border"
        aria-label="Bảng vẽ chữ Hán"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)

          const point = pointFrom(event)

          setDrawing(true)
          setStrokes((previous) => [...previous, [point]])
        }}
        onPointerMove={(event) => {
          if (!drawing) return

          const point = pointFrom(event)

          setStrokes((previous) => {
            const last = previous[previous.length - 1]

            if (!last) return previous

            return [...previous.slice(0, -1), [...last, point]]
          })
        }}
        onPointerUp={() => setDrawing(false)}
        onPointerCancel={() => setDrawing(false)}
      />

      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={strokes.length === 0}
          onClick={() => setStrokes((previous) => previous.slice(0, -1))}
        >
          Xóa nét cuối
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={strokes.length === 0}
          onClick={() => {
            setStrokes([])
            setCandidates([])
            setStatus('idle')
          }}
        >
          Xóa hết
        </Button>
      </div>

      {status === 'working' && (
        <p className="text-caption text-text-secondary">Đang nhận dạng...</p>
      )}

      {status === 'error' && (
        // Báo lỗi rõ ràng và nhắc đường thay thế — KHÔNG treo im lặng.
        <p role="alert" className="text-caption text-error">
          Không nhận dạng được. Bạn vẫn có thể gõ bằng bàn phím.
        </p>
      )}

      {candidates.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {candidates.map((character) => (
            <li key={character}>
              <button
                type="button"
                onClick={() => {
                  onPick(character)
                  setStrokes([])
                  setCandidates([])
                }}
                className="border-border bg-surface font-hanzi hover:bg-primary-pale text-hanzi-title rounded-control size-12 border"
              >
                {character}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
