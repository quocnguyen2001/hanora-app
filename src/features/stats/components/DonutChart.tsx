/**
 * Biểu đồ tròn 3 phần, SVG thuần.
 *
 * Chú thích LUÔN kèm nhãn chữ và phần trăm — số liệu không được đọc chỉ bằng
 * màu. Ba màu ở đây là success/warning/primary, và với người mù màu thì cặp
 * xanh-cam khó phân biệt; nhãn chữ mới là thứ mang thông tin.
 */
const SLICES = [
  { key: 'mastered', label: 'Đã học', color: 'var(--color-success)' },
  { key: 'learning', label: 'Đang học', color: 'var(--color-warning)' },
  { key: 'new', label: 'Chưa học', color: 'var(--color-primary)' },
] as const

export function DonutChart({
  distribution,
}: {
  distribution: { new: number; learning: number; mastered: number }
}) {
  const size = 120
  const radius = 45
  const circumference = 2 * Math.PI * radius

  /*
   * Tính sẵn độ dài và độ lệch của từng cung TRƯỚC khi render.
   *
   * Cách hiển nhiên hơn — cộng dồn một biến `offset` bên trong `.map()` — là
   * đột biến giá trị trong lúc render, và React Compiler bắt đúng chuyện đó.
   * Nó cũng cho ra kết quả sai nếu React render lại danh sách mà không chạy lại
   * cả hàm.
   */
  const arcs = SLICES.reduce<{ key: string; color: string; length: number; offset: number }[]>(
    (accumulator, slice) => {
      const length = (distribution[slice.key] / 100) * circumference
      const previous = accumulator[accumulator.length - 1]
      const offset = previous ? previous.offset + previous.length : 0

      return [...accumulator, { key: slice.key, color: slice.color, length, offset }]
    },
    [],
  )

  return (
    <div className="flex items-center gap-5">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-28 shrink-0 -rotate-90"
        role="img"
        aria-label="Phân loại từ trong kho"
      >
        <title>Phân loại từ trong kho</title>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-primary-pale)"
          strokeWidth="12"
        />

        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth="12"
            strokeDasharray={`${arc.length} ${circumference - arc.length}`}
            strokeDashoffset={-arc.offset}
          />
        ))}
      </svg>

      <ul className="space-y-1.5">
        {SLICES.map((slice) => (
          <li key={slice.key} className="text-body flex items-center gap-2">
            <span
              aria-hidden
              className="size-3 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-text-secondary">{slice.label}</span>
            <span className="text-text-primary">{distribution[slice.key]}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
