import { Link } from 'react-router'
import { ContrastIcon, MoonIcon, SunIcon } from '@/components/icons'
import { HanViet } from '@/components/common/HanViet'
import { HanziText } from '@/components/common/HanziText'
import { Pinyin } from '@/components/common/Pinyin'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Segmented, type SegmentedItem } from '@/components/ui/Segmented'
import {
  FONT_SCALES,
  resolveTheme,
  type FontChoice,
  type MotionChoice,
  type TextTone,
  type Theme,
} from '@/lib/display-theme'
import { useDisplay } from '@/stores/display'
import { AccentPicker } from '../components/AccentPicker'

const THEME_ITEMS: readonly SegmentedItem<Theme>[] = [
  { value: 'light', label: 'Sáng', icon: <SunIcon size={20} /> },
  { value: 'dark', label: 'Tối', icon: <MoonIcon size={20} /> },
  { value: 'system', label: 'Hệ thống', icon: <ContrastIcon size={20} /> },
]

/*
 * Mỗi nút font tự render nhãn BẰNG CHÍNH font đó. Một hàng ba nút cùng một kiểu
 * chữ thì người dùng phải chọn mù rồi nhìn ra ngoài mới biết mình vừa chọn gì.
 */
const FONT_ITEMS: readonly SegmentedItem<FontChoice>[] = [
  { value: 'inter', label: 'Inter', hint: 'Hiện đại', previewClassName: 'font-sans' },
  { value: 'lora', label: 'Lora', hint: 'Serif ấm', previewClassName: 'font-lora' },
  { value: 'system', label: 'Hệ thống', hint: 'Máy bạn', previewClassName: 'font-system' },
]

/*
 * Bốn tông không tự tô màu trên nút — màu của chúng khai theo `:root[data-text-tone]`
 * nên chỉ có hiệu lực ở gốc cây. Khối xem trước phía trên đã đổi ngay khi chọn,
 * và đó là chỗ so sánh đúng: tông chữ cần nhìn trên một đoạn nội dung thật, chứ
 * không phải trên một nhãn hai chữ.
 */
const TONE_ITEMS: readonly SegmentedItem<TextTone>[] = [
  { value: 'ink', label: 'Mực đậm' },
  { value: 'soft', label: 'Xám dịu' },
  { value: 'warm', label: 'Nâu ấm' },
  { value: 'high', label: 'Tương phản cao' },
]

const MOTION_ITEMS: readonly SegmentedItem<MotionChoice>[] = [
  { value: 'full', label: 'Đầy đủ', hint: 'Mượt mà' },
  { value: 'reduced', label: 'Giảm', hint: 'Ít chuyển động' },
]

/*
 * Nhãn phải khớp với FONT_SCALES = [0.9, 1, 1.1, 1.2, 1.3].
 *
 * Thang này LỆCH một bên — một nấc dưới mặc định, ba nấc trên — vì người ta
 * chỉnh cỡ chữ gần như luôn là để phóng to. Đánh nhãn như một thang cân đối
 * ('Nhỏ, Hơi nhỏ, Vừa, …') làm mức 100% đọc thành "Hơi nhỏ", tức là nói với
 * người dùng screen reader rằng mặc định của app nhỏ hơn bình thường.
 */
const SCALE_LABELS = ['Nhỏ', 'Vừa', 'Lớn', 'Rất lớn', 'Cực lớn']

/**
 * Màn Hiển thị & chữ.
 *
 * Mọi thứ ở đây lưu trong `localStorage` của THIẾT BỊ, không đụng backend —
 * cỡ chữ lớn trên điện thoại không có nghĩa người dùng muốn chữ lớn trên laptop.
 */
export function DisplaySettingsPage() {
  const display = useDisplay()
  const scaleIndex = Math.max(0, FONT_SCALES.indexOf(display.fontScale))

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link to="/account" className="text-body text-text-secondary hover:text-primary">
          ← Tài khoản
        </Link>
        <h1 className="text-title">Hiển thị &amp; chữ</h1>
        <p className="text-body text-text-secondary">
          Lưu riêng trên thiết bị này. Không đồng bộ sang máy khác.
        </p>
      </header>

      {/*
        Khối xem trước là phần quan trọng nhất của màn, không phải trang trí.

        Không có nó, người dùng phải đổi một lựa chọn rồi rời màn mới biết kết
        quả — và mỗi lần muốn so sánh lại phải đi hai chiều. Nội dung xem trước
        cố tình dùng ĐÚNG loại nội dung app hiển thị (chữ Hán, pinyin, âm
        Hán-Việt, nghĩa Việt) chứ không phải một dòng "Lorem ipsum": thứ cần
        đánh giá là chữ Hán có rõ không và dấu tiếng Việt có bị chồng không.
      */}
      <Card size="hero" className="flex flex-col items-center gap-2 text-center">
        <p className="text-caption text-text-secondary">Xem trước</p>
        <HanziText size="hero">学习</HanziText>
        <Pinyin>xuéxí</Pinyin>
        <HanViet>học tập</HanViet>
        <p className="text-meaning text-text-primary">học tập, học hỏi</p>
        <p className="text-body text-text-secondary">to study; to learn</p>
      </Card>

      <Section title="Chủ đề">
        <Segmented
          items={THEME_ITEMS}
          value={display.theme}
          onChange={display.setTheme}
          label="Chủ đề"
          columns="even"
        />
      </Section>

      {/*
        Màu chủ đạo đứng NGAY SAU Chủ đề, trước Font chữ.

        Hai mục đầu là hai nửa của cùng một câu hỏi ("app trông như thế nào"),
        và chúng ăn chung một khối xem trước ở trên. Đẩy màu xuống cuối thì
        người dùng phải cuộn qua ba mục về chữ mới tới thứ đổi nhiều nhất về
        mặt thị giác.
      */}
      <Section
        title="Màu chủ đạo"
        note="Đổi màu nút, tab đang chọn, viền và mọi điểm nhấn trong app. Chữ và nền giữ nguyên."
      >
        <AccentPicker
          value={display.accent}
          onChange={display.setAccent}
          theme={resolveTheme(display.theme)}
        />
      </Section>

      <Section title="Font chữ" note="Chữ Hán luôn dùng font hệ thống, không đổi theo mục này.">
        <Segmented
          items={FONT_ITEMS}
          value={display.font}
          onChange={display.setFont}
          label="Font chữ"
          columns="even"
        />
      </Section>

      <Section title="Cỡ chữ">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-caption text-text-secondary">
            A
          </span>
          <input
            type="range"
            min={0}
            max={FONT_SCALES.length - 1}
            step={1}
            value={scaleIndex}
            onChange={(event) => {
              const next = FONT_SCALES[Number(event.target.value)]

              if (next !== undefined) display.setFontScale(next)
            }}
            // Screen reader đọc "3" thì vô nghĩa — `aria-valuetext` nói ra chữ.
            aria-label="Cỡ chữ"
            aria-valuetext={`${SCALE_LABELS[scaleIndex]}, ${Math.round(display.fontScale * 100)}%`}
            className="accent-primary min-h-11 flex-1"
          />
          <span aria-hidden className="text-title text-text-secondary">
            A
          </span>
        </div>
        <p className="text-caption text-text-secondary mt-1 text-center">
          {SCALE_LABELS[scaleIndex]} · {Math.round(display.fontScale * 100)}%
        </p>
      </Section>

      <Section title="Tông chữ">
        <Segmented
          items={TONE_ITEMS}
          value={display.textTone}
          onChange={display.setTextTone}
          label="Tông chữ"
          className="flex-wrap"
        />
      </Section>

      <Section
        title="Độ mượt hiệu ứng"
        note="Nếu bạn đã tắt hiệu ứng trong cài đặt hệ điều hành thì app luôn tôn trọng lựa chọn đó, bất kể mục này."
      >
        <Segmented
          items={MOTION_ITEMS}
          value={display.motion}
          onChange={display.setMotion}
          label="Độ mượt hiệu ứng"
          columns="even"
        />
      </Section>

      <Button variant="secondary" fullWidth onClick={display.reset}>
        Khôi phục mặc định
      </Button>
    </div>
  )
}

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-section">{title}</h2>
      {children}
      {note && <p className="text-caption text-text-secondary">{note}</p>}
    </section>
  )
}
