/**
 * Mark thương hiệu — hoa anh đào năm cánh.
 *
 * SVG INLINE chứ không phải `<img src="logo.svg">`. Ba lý do:
 *
 *   1. `currentColor` chỉ ăn được khi SVG nằm trong cây DOM của trang. Một
 *      `<img>` là tài liệu biệt lập, nên mark sẽ kẹt một màu cố định và sai tông
 *      ở chủ đề tối.
 *   2. Không thêm một request nữa cho một hình 500 byte.
 *   3. Wordmark `hanora` giữ là text HTML thật bên cạnh, nên nó dùng đúng font
 *      giao diện mà người dùng chọn ở màn Hiển thị & chữ. SVG tĩnh không làm
 *      được điều đó.
 *
 * Hình học 5 cánh xoay 72° dùng chung với `IllustrationPlaceholder` và
 * `icon-source.svg` — cùng một họ, không phải ba bông hoa khác nhau.
 *
 * `aria-hidden` mặc định: mark đứng CẠNH chữ `hanora`, nên đọc tên thương hiệu
 * hai lần là thừa. Chỗ nào dùng mark một mình mà không có chữ thì truyền
 * `label` để nó thành ảnh có tên.
 */
const ANGLES = [0, 72, 144, 216, 288]

export function BrandMark({
  size = 24,
  label,
  className,
}: {
  size?: number
  label?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {/*
        Cánh ELLIPSE TRƠN, không phải cánh có khuyết chữ V của `icon-source.svg`.
        Cùng lý do mà `favicon.svg` đơn giản hóa: mark ở đây render quanh 22px,
        và ở cỡ đó khuyết đầu cánh chỉ còn dưới 1px. Nó không đọc ra là khuyết —
        nó đọc thành gai, và cả bông thành hình bông tuyết.

        Quy ước của hệ thống: cánh có khuyết cho bề mặt lớn (icon PWA), cánh trơn
        cho cỡ nhỏ (favicon, mark inline). Đây là cùng hình học mà
        `IllustrationPlaceholder` dùng.
      */}
      {ANGLES.map((angle) => (
        <ellipse
          key={angle}
          cx="12"
          cy="7.4"
          rx="2.9"
          ry="4.1"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}

      {/*
        Nhụy mờ hơn thân cánh thay vì một màu riêng: mark chỉ có MỘT màu
        (`currentColor`), nên tương phản trong lòng hoa phải làm bằng độ mờ.
        Dùng màu thứ hai là buộc chỗ gọi phải biết cả hai, và mark hết đổi màu
        theo chủ đề được.
      */}
      <circle cx="12" cy="12" r="1.6" fill="currentColor" opacity="0.45" />
    </svg>
  )
}
