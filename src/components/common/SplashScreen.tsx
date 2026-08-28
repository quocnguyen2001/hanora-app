import { useEffect, useState } from 'react'
import { BrandMark } from '@/components/common/BrandMark'
import appConfig from '@/config/app.json'

/**
 * Thời gian TỐI THIỂU màn khởi động ở lại, tính từ lúc React vẽ khung đầu.
 *
 * Đây là sàn, không phải một khoảng chờ cứng: app mount NGAY phía sau lớp phủ
 * và không hề bị hoãn, nên trên máy nhanh đây là toàn bộ chi phí, còn trên máy
 * chậm phần việc thật diễn ra trong lúc lớp phủ còn đó.
 *
 * Có sàn vì nếu không, trên máy nhanh logo chỉ loé lên một hai khung hình rồi
 * biến mất — đọc ra là lỗi nhấp nháy chứ không phải một màn thương hiệu.
 *
 * 400ms khớp `--transition-duration-progress`, mức mà design system đã dành cho
 * "chuyển động đủ dài để cảm được là trôi mượt".
 */
export const MIN_VISIBLE_MS = 400

/**
 * Chốt chặn: lớp phủ tự tháo mình ra sau ngần này kể từ lúc bắt đầu tan, kể cả
 * khi `animationend` không bao giờ bắn.
 *
 * Đây KHÔNG phải bản sao của thời lượng trong `--animate-splash-out`, và cố ý
 * không khớp nó. Nó chỉ cần là một CẬN TRÊN rộng rãi, nên sửa token animation
 * không bao giờ làm nó sai.
 *
 * Cần chốt chặn này vì hỏng ở đây là hỏng nặng nhất có thể: `animationend` phụ
 * thuộc vào việc animation THẬT SỰ chạy, mà điều đó không được bảo đảm — một
 * extension chặn animation, một `@media` đè `animation: none`, hay một trình
 * duyệt lệch chuẩn là đủ. Khi đó lớp phủ toàn màn hình nằm lại vĩnh viễn và app
 * coi như chết dù đã mount và chạy bình thường ngay phía sau.
 */
export const FADE_TIMEOUT_MS = 1000

/**
 * Màn khởi động — hoa anh đào, wordmark, và phiên bản đang chạy.
 *
 * KHÔNG nằm trong `index.html`. Lớp phủ ở đó sẽ che được cả quãng trước khi
 * bundle JS tải xong, nhưng quãng đó KHÔNG phải màn trắng: script trong
 * `index.html` đặt `data-theme` trước khung hình đầu, và `body` đã mang
 * `--color-background`. Người dùng thấy nền đúng chủ đề chứ không thấy lỗi.
 *
 * Đổi lại, dựng nó bằng React giữ đúng giao ước thương hiệu TRONG app:
 * `<BrandMark />` ăn `currentColor` nên đổi màu theo chủ đề, và `hanora` là
 * text HTML thật nên nó theo font người dùng chọn ở màn Hiển thị & chữ. Một
 * lớp phủ trong `index.html` không import được component, nên nó buộc phải
 * nhúng bản sao thứ tư của hình hoa (sau `BrandMark`, `icon-source.svg`,
 * `favicon.svg`) hoặc dùng `<img>` kẹt cứng một màu và sai tông ở chủ đề tối.
 *
 * `aria-hidden`: lớp phủ thuần trang trí và chỉ sống vài trăm ms. App mount
 * ngay phía sau nó, nên người dùng screen reader đọc thẳng nội dung thật thay
 * vì bị chặn bởi một tấm bìa rồi phải điều hướng lại khi nó biến mất.
 */
export function SplashScreen() {
  const [leaving, setLeaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), MIN_VISIBLE_MS)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!leaving) return

    const timer = setTimeout(() => setDone(true), FADE_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [leaving])

  if (done) return null

  return (
    <div
      aria-hidden
      // `fixed inset-0` + `z-50`: phải nằm trên cả header và thanh điều hướng
      // (`z-20`), nếu không hai thứ đó thò lên xuyên qua màn khởi động.
      className={`bg-background fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 ${
        leaving ? 'animate-splash-out' : ''
      }`}
      /*
       * Đường NHANH: tháo ngay khi animation tan xong, nên reduced-motion (bị
       * ép về 0.01ms) biến mất tức thì thay vì đợi hết `FADE_TIMEOUT_MS`.
       *
       * Đường CHẬM là chốt chặn ở effect bên trên. Cặp này cố ý thừa: đường
       * nhanh lo trải nghiệm, đường chậm lo việc app không bao giờ bị một lớp
       * phủ chết đè lên.
       *
       * jsdom không dựng `AnimationEvent` nên React không gắn nổi listener này
       * trong test — đường nhanh chỉ kiểm được trên trình duyệt thật. Đó là một
       * lý do nữa để chốt chặn tồn tại và để test bám vào nó.
       */
      onAnimationEnd={() => setDone(true)}
    >
      {/*
        Cùng lockup mà `AppHeader` dùng — mark + chữ, KHÔNG phải file ảnh logo
        (`logo.svg` cố ý chỉ dùng ngoài app) — nhưng XẾP DỌC thay vì ngang.

        Thang chữ của design system dừng ở `--text-title` 24px và đó là chủ ý,
        nên không có cỡ chữ nào đủ lớn cho một wordmark nằm ngang giữa màn hình.
        Dựng thêm token chỉ để dùng đúng một chỗ là làm hỏng thang chữ; xếp dọc
        cho phép MARK gánh phần cỡ lớn còn chữ vẫn ở đúng bậc có sẵn.
      */}
      <div className="text-primary flex flex-col items-center gap-3 lowercase">
        <BrandMark size={64} />
        <span className="text-title">hanora</span>
      </div>

      <p className="text-body text-text-secondary">Học từ vựng tiếng Trung</p>

      {/*
        Phiên bản để người dùng nói được họ đang chạy bản nào khi báo lỗi. Đặt
        tách hẳn xuống dưới thay vì cạnh wordmark: nó là dữ liệu kỹ thuật, không
        phải một phần của thương hiệu.
      */}
      <p className="text-caption text-text-secondary absolute bottom-10">v{appConfig.version}</p>
    </div>
  )
}
