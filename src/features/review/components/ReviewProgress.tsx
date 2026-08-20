/**
 * Thanh tiến độ + `3 / 10` theo showcase.
 *
 * Con số hiển thị bằng CHỮ chứ không chỉ bằng độ dài thanh: thanh màu một mình
 * không nói được còn bao nhiêu thẻ, và người dùng screen reader thì không thấy
 * gì cả.
 */
export function ReviewProgress({ current, total }: { current: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((current / total) * 100)

  return (
    <div className="space-y-1.5">
      <div className="text-caption text-text-secondary flex items-center justify-between">
        <span>Tiến độ</span>
        <span>
          {current} / {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Đã làm ${current} trên ${total} thẻ`}
        className="bg-primary-pale h-2 overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
