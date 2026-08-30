import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AudioButton } from '@/components/common/AudioButton'
import { Card } from '@/components/ui/Card'
import { VoiceListSkeleton } from '@/components/ui/PageSkeleton'
import { useSpeech } from '@/hooks/use-speech'
import { listChineseVoices, onVoicesReady, type VoiceOption } from '@/lib/audio'
import { cn } from '@/lib/cn'
import { useVoice } from '@/stores/voice'

/*
 * Câu mẫu để nghe thử là một CÂU, không phải một từ đơn.
 *
 * Hai giọng đọc một từ hai âm tiết nghe gần như nhau; thứ phân biệt chúng là
 * nhịp câu và cách xử lý thanh điệu nối tiếp. Câu này có đủ bốn thanh và ngắn
 * đủ để nghe đi nghe lại vài lần mà không sốt ruột.
 */
const SAMPLE_TEXT = '你好，我们一起学习中文'

const AUTO_KEY = 'auto'

/*
 * Khoá hàng giọng có tiền tố riêng. Không có nó thì một giọng mà hệ điều hành
 * đặt `voiceURI === 'auto'` sẽ đụng khoá của hàng Tự động: hai hàng cùng khoá,
 * React cảnh báo, và cả hai cùng được đánh dấu chọn.
 */
function voiceKey(uri: string): string {
  return `v:${uri}`
}

/**
 * Màn Giọng đọc.
 *
 * Lưu trong `localStorage` của THIẾT BỊ, không đụng backend: danh sách giọng do
 * hệ điều hành cung cấp và khác nhau giữa các máy, nên đồng bộ một `voiceURI`
 * chỉ có trên macOS sang điện thoại Android là đồng bộ một giá trị vô nghĩa.
 */
export function VoiceSettingsPage() {
  /*
   * `null` = CHƯA BIẾT, `[]` = chắc chắn không có giọng nào. Hai trạng thái
   * khác nhau: `getVoices()` trả rỗng ở lần gọi đầu trên một số trình duyệt,
   * nên gộp chúng lại sẽ làm máy hoàn toàn bình thường cũng chớp thông báo
   * "thiết bị không hỗ trợ" trong mili giây đầu.
   */
  const [voices, setVoices] = useState<VoiceOption[] | null>(null)

  useEffect(() => {
    const detach = onVoicesReady(() => setVoices(listChineseVoices()))

    /*
     * Máy KHÔNG có giọng nào thì `voiceschanged` không bao giờ bắn, và trang sẽ
     * đứng ở khung xương vĩnh viễn — đúng thiết bị cần lời giải thích nhất lại
     * là thiết bị không bao giờ nhận được nó.
     *
     * 1,5s: đủ dài để không cắt ngang một máy đang nạp danh sách chậm, đủ ngắn
     * để không ai nghĩ trang bị treo.
     */
    const timer = setTimeout(() => setVoices((current) => current ?? listChineseVoices()), 1500)

    return () => {
      detach()
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link to="/account" className="text-body text-text-secondary hover:text-primary">
          ← Tài khoản
        </Link>
        <h1 className="text-title">Giọng đọc</h1>
        <p className="text-body text-text-secondary">
          Lưu riêng trên thiết bị này. Không đồng bộ sang máy khác.
        </p>
      </header>

      {voices === null ? <VoiceListSkeleton /> : <VoiceBody voices={voices} />}
    </div>
  )
}

function VoiceBody({ voices }: { voices: VoiceOption[] }) {
  const voiceURI = useVoice((state) => state.voiceURI)
  const setVoice = useVoice((state) => state.setVoice)
  const speech = useSpeech()

  /*
   * Giọng đã lưu không còn trên thiết bị (đổi máy, đổi trình duyệt, iOS gỡ
   * giọng). `audio.ts` đã im lặng rơi về chấm điểm, nên radio phải chỉ vào
   * "Tự động" — đó là thứ đang THỰC SỰ phát.
   *
   * KHÔNG ghi đè `voiceURI` trong store về `null`: người dùng mở lại trên máy
   * cũ thì lựa chọn cũ vẫn còn nguyên.
   */
  const missing = voiceURI !== null && !voices.some((voice) => voice.uri === voiceURI)
  const selectedKey = voiceURI === null || missing ? AUTO_KEY : voiceKey(voiceURI)

  if (voices.length === 0) {
    return (
      <Card className="space-y-2">
        <p className="text-section text-text-primary">Thiết bị chưa có giọng tiếng Trung</p>
        <p className="text-body text-text-secondary">
          Danh sách giọng do hệ điều hành cung cấp, không phải do hanora cài. Trình duyệt trên máy
          này chưa có giọng tiếng Trung nào nên nút phát âm sẽ tắt. Máy iPhone và iPad thường phải
          tải thêm giọng trong Cài đặt → Trợ năng → Nội dung đã nói.
        </p>
      </Card>
    )
  }

  const rows: VoiceRow[] = [
    {
      key: AUTO_KEY,
      uri: null,
      name: 'Tự động',
      // "Tự động" mà không nói ra nó đang dùng giọng nào thì là một hộp đen:
      // người dùng không so được nó với các hàng bên dưới, và nghe thử xong
      // cũng không hiểu vì sao nó giống hệt một hàng khác.
      meta: `Đang dùng: ${voices[0]?.name}`,
    },
    ...voices.map((voice) => ({
      key: voiceKey(voice.uri),
      uri: voice.uri,
      name: voice.name,
      // Giọng mạng có độ trễ và chết khi ngoại tuyến — đáng để biết TRƯỚC khi chọn.
      meta: voice.local ? `${voice.lang} · Trên máy` : `${voice.lang} · Qua mạng`,
    })),
  ]

  return (
    <section className="space-y-2">
      <VoiceRadioGroup
        rows={rows}
        selectedKey={selectedKey}
        onSelect={(uri) => setVoice(uri)}
        renderAction={(row) => (
          <AudioButton
            state={speech.stateFor(`voice:${row.key}`)}
            // Tham số thứ ba ép giọng của CHÍNH hàng này. Thiếu nó thì mọi nút
            // nghe thử đều phát bằng giọng đang chọn, và màn này vô dụng.
            onPlay={() => speech.play(SAMPLE_TEXT, `voice:${row.key}`, row.uri)}
            size="sm"
            name={row.name}
          />
        )}
      />

      {missing && (
        <p className="text-caption text-text-secondary">
          Giọng bạn chọn trước đây không có trên thiết bị này, nên hanora đang tự chọn giọng thay.
          Lựa chọn cũ vẫn được giữ cho máy khác.
        </p>
      )}
    </section>
  )
}

interface VoiceRow {
  key: string
  uri: string | null
  name: string
  meta: string
}

/**
 * Danh sách lựa chọn giọng.
 *
 * KHÔNG tái dùng `Segmented`: đó là một hàng ngang cho 2-5 nhãn ngắn, còn ở đây
 * số giọng là 0-20 tùy máy và nhãn dài tới mức
 * "Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)". Nhồi vào hàng
 * ngang thì tên bị cắt — mà tên chính là thứ duy nhất người dùng dựa vào để chọn.
 *
 * Nhưng GIỮ NGUYÊN bài học a11y của `Segmented`: `radiogroup` chỉ có MỘT điểm
 * dừng Tab, và mũi tên di chuyển giữa lựa chọn. Để mọi hàng cùng nhận Tab thì
 * người dùng bàn phím phải Tab qua cả 15 giọng mới ra khỏi nhóm.
 *
 * Khác `Segmented` một điểm: ở đây con trỏ bàn phím ĐI THEO lựa chọn. Danh sách
 * dọc dài thì vòng focus đứng lại ở hàng cũ trong khi dấu chọn nhảy đi chỗ khác
 * là mất phương hướng thật sự, chứ không như một nhóm ba nút nhìn thấy hết.
 */
function VoiceRadioGroup({
  rows,
  selectedKey,
  onSelect,
  renderAction,
}: {
  rows: VoiceRow[]
  selectedKey: string
  onSelect: (uri: string | null) => void
  renderAction: (row: VoiceRow) => React.ReactNode
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  function move(direction: 1 | -1) {
    const index = rows.findIndex((row) => row.key === selectedKey)

    if (index < 0) return

    // Vòng lại đầu/cuối: mũi tên trong radiogroup không được đi vào ngõ cụt.
    const nextIndex = (index + direction + rows.length) % rows.length
    const next = rows[nextIndex]

    if (!next) return

    onSelect(next.uri)
    buttons.current[nextIndex]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Giọng đọc"
      className="space-y-2"
      onKeyDown={(event) => {
        /*
         * CHỈ nghe phím phát ra từ chính các radio.
         *
         * Nút nghe thử nằm bên trong nhóm nên sự kiện của nó cũng nổi lên tới
         * đây. Không lọc thì người dùng bàn phím đang đứng ở nút nghe thử mà bấm
         * mũi tên sẽ GHI ĐÈ giọng đã lưu và bị cướp focus — một thao tác cuộn
         * danh sách lại làm đổi cài đặt, không có phản hồi nào nói điều đó.
         */
        if ((event.target as HTMLElement).getAttribute('role') !== 'radio') return

        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
          event.preventDefault()
          move(1)
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
          event.preventDefault()
          move(-1)
        }
      }}
    >
      {rows.map((row, index) => {
        const selected = row.key === selectedKey

        return (
          <div key={row.key} className="flex items-center gap-2">
            <button
              ref={(element) => {
                buttons.current[index] = element
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(row.uri)}
              className={cn(
                'rounded-card min-h-11 flex-1 px-4 py-3 text-left',
                'duration-press ease-soft border transition active:scale-[0.99]',
                selected
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border bg-surface hover:bg-primary-pale',
              )}
            >
              <span
                className={cn(
                  'text-body block font-medium',
                  selected ? 'text-primary' : 'text-text-primary',
                )}
              >
                {row.name}
              </span>
              <span className="text-caption text-text-secondary block">{row.meta}</span>
            </button>

            {renderAction(row)}
          </div>
        )
      })}
    </div>
  )
}
