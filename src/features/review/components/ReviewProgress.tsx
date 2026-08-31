/**
 * Thanh tiến độ + `3 / 10` theo showcase.
 *
 * Con số hiển thị bằng CHỮ chứ không chỉ bằng độ dài thanh: thanh màu một mình
 * không nói được còn bao nhiêu thẻ, và người dùng screen reader thì không thấy
 * gì cả.
 *
 * `current` phải là SỐ THẺ ĐÃ XONG (đã trả lời đúng và rời hàng đợi), không
 * phải số lượt đã nộp. Hai con số đó bằng nhau cho tới khi có một câu sai: thẻ
 * sai quay lại cuối hàng đợi, và nếu đếm theo lượt nộp thì thanh chạm 6/6 trong
 * khi màn hình vẫn còn thẻ — người dùng đọc đó là "đã xong mà không có tổng
 * kết", và không có gì nói cho họ biết còn lại bao nhiêu.
 */
export function ReviewProgress({
  current,
  total,
  retrying = false,
}: {
  current: number
  total: number
  /** Mọi thẻ đã trả lời lượt đầu; phần còn lại là làm lại thẻ đã sai. */
  retrying?: boolean
}) {
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
      <div className="text-caption text-text-secondary flex items-center justify-between font-bold">
        {/* Nói rõ đang ở vòng nào: thẻ lặp lại mà không giải thích thì trông
            như màn hình bị kẹt. */}
        <span>{retrying ? 'Làm lại thẻ đã sai' : 'Tiến độ'}</span>
        <span>
          {safeCurrent} / {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={safeCurrent}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={
          retrying
            ? `Còn ${total - safeCurrent} thẻ sai cần làm lại`
            : `Đã xong ${safeCurrent} trên ${total} thẻ`
        }
        // h-3 chứ không h-2: thanh này là thứ người học liếc lên giữa các thẻ
        // để biết còn bao xa, và ở 8px nó mảnh tới mức phải nhìn kỹ mới thấy
        // đã nhích hay chưa. Rãnh dùng `bg-border` chứ không `bg-primary-pale`
        // — hồng cực nhạt trên nền trắng gần như vô hình, nên phần CHƯA xong
        // không đọc ra được và thanh chỉ còn một nửa ý nghĩa.
        className="bg-border h-3 overflow-hidden rounded-full"
      >
        <div
          className="bg-primary duration-progress ease-soft h-full rounded-full transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
