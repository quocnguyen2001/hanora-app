/**
 * Thanh tiến độ + `3 / 10` theo showcase.
 *
 * Con số hiển thị bằng CHỮ chứ không chỉ bằng độ dài thanh: thanh màu một mình
 * không nói được còn bao nhiêu thẻ, và người dùng screen reader thì không thấy
 * gì cả.
 */
export function ReviewProgress({ current, total }: { current: number; total: number }) {
  /*
   * Kẹp trong [0, total]: `aria-valuenow` lớn hơn `aria-valuemax` là hợp đồng
   * ARIA sai, và số hiển thị kiểu "13 / 10" thì vô nghĩa. Server hiện chỉ đếm
   * lượt đầu nên không vượt được, nhưng thanh tiến độ không nên phụ thuộc vào
   * một bất biến ở phía bên kia mạng.
   */
  const safeCurrent = Math.min(Math.max(current, 0), total)
  const percent = total === 0 ? 0 : Math.round((safeCurrent / total) * 100)

  return (
    <div className="space-y-1.5">
      <div className="text-caption text-text-secondary flex items-center justify-between">
        <span>Tiến độ</span>
        <span>
          {safeCurrent} / {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={safeCurrent}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Đã làm ${safeCurrent} trên ${total} thẻ`}
        className="bg-primary-pale h-2 overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-progress ease-soft"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
