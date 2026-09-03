import { CheckIcon } from '@/components/icons'
import { cn } from '@/lib/cn'
import { ACCENTS, ACCENT_META, type AccentChoice } from '@/lib/display-theme'

/**
 * Chọn màu chủ đạo.
 *
 * KHÔNG tái dùng `Segmented` dù cùng là `radiogroup`. `Segmented` là một HÀNG
 * nút mang chữ, và sáu nhãn kiểu "Tím oải hương" xếp ngang thì hoặc tràn màn
 * 360px hoặc phải cắt chữ. Ở đây thứ mang thông tin là chính MÀU, nên bố cục
 * đúng là một lưới chấm màu — chữ đứng dưới làm nhãn, không phải làm nội dung.
 *
 * Vai trò a11y và hành vi bàn phím thì giữ y hệt `Segmented`, và giữ có chủ ý:
 * một điểm dừng Tab cho cả nhóm, phím mũi tên đi giữa các lựa chọn, vòng lại ở
 * hai đầu. Hai nhóm cài đặt cạnh nhau mà lái bằng bàn phím khác nhau là lỗi.
 */
export function AccentPicker({
  value,
  onChange,
  theme,
}: {
  value: AccentChoice
  onChange: (accent: AccentChoice) => void
  /**
   * Chủ đề ĐÃ giải quyết (`light`/`dark`), không phải lựa chọn thô.
   *
   * Chấm màu phải vẽ đúng sắc mà người dùng sắp nhận được. Bảng tối dùng một
   * biến thể sáng hơn hẳn của cùng màu (xem `TRỤC 4` trong `tokens.css`), nên
   * vẽ giá trị bảng sáng ở chế độ tối là cho người ta xem trước một màu không
   * tồn tại trong app của họ.
   */
  theme: 'light' | 'dark'
}) {
  function moveFocus(direction: 1 | -1) {
    const index = ACCENTS.indexOf(value)

    if (index < 0) return

    const next = ACCENTS[(index + direction + ACCENTS.length) % ACCENTS.length]

    if (next) onChange(next)
  }

  return (
    <div
      role="radiogroup"
      aria-label="Màu chủ đạo"
      className="grid grid-cols-3 gap-2 sm:grid-cols-6"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault()
          moveFocus(1)
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault()
          moveFocus(-1)
        }
      }}
    >
      {ACCENTS.map((accent) => {
        const meta = ACCENT_META[accent]
        const selected = accent === value
        const swatch = theme === 'dark' ? meta.swatchDark : meta.swatch

        return (
          <button
            key={accent}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(accent)}
            className={cn(
              'rounded-control-lg flex min-h-11 flex-col items-center gap-1.5 border p-2',
              'chunky duration-press ease-soft transition-colors',
              selected
                ? 'border-primary bg-primary-soft chunky-primary'
                : 'border-border bg-surface hover:bg-primary-pale chunky-neutral',
            )}
          >
            {/*
              Chấm màu tô bằng inline style, không phải class token.

              Ngoại lệ đã ghi ở `ACCENT_META`: token `--color-primary` luôn là
              màu ĐANG bật, nên tô bằng nó thì sáu chấm ra cùng một màu và cả ô
              chọn mất nghĩa. Đây là chỗ duy nhất trong app hợp lệ để một mã màu
              đi thẳng vào style — cùng ngoại lệ mà nút chọn font dùng khi tự
              render bằng chính font nó đại diện.

              Viền `inset` thay vì `border`: viền thật cộng vào kích thước hộp,
              nên chấm được chọn sẽ to hơn năm chấm kia 2px và cả hàng lệch nhịp.
            */}
            <span
              aria-hidden
              style={{ backgroundColor: swatch }}
              className={cn(
                'flex size-7 items-center justify-center rounded-full',
                'shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]',
              )}
            >
              {/*
                Dấu ✓ là lớp thứ HAI sau viền của nút. Người không phân biệt được
                sắc màu vẫn phải biết mình đang chọn ô nào, và ở một lưới mà mọi
                ô CHỈ khác nhau ở màu thì đó không phải chi tiết thừa.

                Màu dấu lấy từ `--color-on-primary` — token sinh ra đúng cho câu
                hỏi "chữ gì đọc được trên nền màu chủ đạo". Nhưng nó chỉ đúng cho
                ô ĐANG chọn, vì token đọc màu đang bật; đó cũng là ô duy nhất vẽ
                dấu này.
              */}
              {selected && <CheckIcon size={16} className="text-on-primary" />}
            </span>
            <span
              className={cn(
                'text-caption text-center leading-tight',
                selected ? 'text-primary font-bold' : 'text-text-secondary',
              )}
            >
              {meta.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
