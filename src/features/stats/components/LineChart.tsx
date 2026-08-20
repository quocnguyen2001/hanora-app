/**
 * Biểu đồ đường, SVG thuần.
 *
 * KHÔNG kéo thư viện chart vào bundle PWA: hai biểu đồ nhỏ và tĩnh, mỗi cái
 * ~100 dòng SVG, còn một thư viện chart là hàng chục KB gzip mà người dùng phải
 * tải trước khi app chạy được. Với app cài offline thì đó là chi phí thật.
 *
 * Số liệu đọc được KHÔNG chỉ bằng hình: có `<title>` cho screen reader và nhãn
 * giá trị cuối hiển thị bằng chữ.
 */
export function LineChart({
  series,
  label,
}: {
  series: { label: string; value: number }[]
  label: string
}) {
  if (series.length === 0) return null

  const width = 320
  const height = 120
  const padding = 16

  const values = series.map((point) => point.value)
  const max = Math.max(...values, 1)

  const points = series.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(series.length - 1, 1)
    const y = height - padding - (point.value / max) * (height - padding * 2)

    return { x, y, ...point }
  })

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')

  const last = points[points.length - 1]
  const total = values.reduce((sum, value) => sum + value, 0)

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`${label}: tổng ${total} lượt trong ${series.length} ngày`}
      >
        <title>{`${label}: tổng ${total} lượt trong ${series.length} ngày`}</title>

        {/* Vùng dưới đường, rất nhạt — gợi khối lượng mà không lấn chữ. */}
        <path
          d={`${path} L ${last?.x ?? 0} ${height - padding} L ${points[0]?.x ?? 0} ${height - padding} Z`}
          fill="var(--color-primary)"
          opacity="0.08"
        />

        <path
          d={path}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point) => (
          <circle key={point.label} cx={point.x} cy={point.y} r="2.5" fill="var(--color-primary)" />
        ))}

        {last && (
          <circle
            cx={last.x}
            cy={last.y}
            r="4.5"
            fill="var(--color-surface)"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
          />
        )}
      </svg>

      <figcaption className="text-caption text-text-secondary mt-1 text-right">
        Hôm nay: <span className="text-text-primary">{last?.value ?? 0}</span> lượt
      </figcaption>
    </figure>
  )
}
