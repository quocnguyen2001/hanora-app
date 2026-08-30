import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { STORAGE_KEY, useVoice } from '@/stores/voice'
import { stubSynth, stubUtterance, voice } from '@/test/speech'
import { VoiceSettingsPage } from './pages/VoiceSettingsPage'

/*
 * Danh sách cố tình để giọng nam ĐỨNG ĐẦU. Thuật toán chấm điểm sẽ đẩy
 * `Tingting` lên trước, nên mọi khẳng định dưới đây phân biệt được "app chọn
 * hộ" với "lấy đại phần tử đầu tiên".
 */
const VOICES = [voice('Kangkang', 'zh-CN'), voice('Tingting', 'zh-CN'), voice('Meijia', 'zh-TW')]

function renderPage() {
  return render(
    <MemoryRouter>
      <VoiceSettingsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  stubUtterance()
  useVoice.setState({ voiceURI: null })
  window.localStorage.removeItem(STORAGE_KEY)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('màn Giọng đọc', () => {
  it('liệt kê mọi giọng tiếng Trung kèm mục Tự động, và Tự động được chọn sẵn', () => {
    stubSynth(VOICES)
    renderPage()

    const radios = screen.getAllByRole('radio')

    expect(radios).toHaveLength(VOICES.length + 1)
    expect(screen.getByRole('radio', { name: /^Tingting/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^Kangkang/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^Meijia/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Tự động/ })).toBeChecked()
  })

  it('mục Tự động nói ra tên giọng nó đang dùng', () => {
    stubSynth(VOICES)
    renderPage()

    // Không có dòng này thì "Tự động" là một hộp đen: người dùng không so được
    // nó với các hàng bên dưới, và nghe thử xong cũng không hiểu vì sao nó
    // giống hệt một hàng khác.
    expect(screen.getByRole('radio', { name: /Đang dùng: Tingting/ })).toBeInTheDocument()
  })

  it('chọn một giọng thì ghi xuống store', async () => {
    stubSynth(VOICES)
    renderPage()

    await userEvent.click(screen.getByRole('radio', { name: /Meijia/ }))

    expect(useVoice.getState().voiceURI).toBe('Meijia')
  })

  it('nghe thử phát bằng giọng của CHÍNH hàng đó, không phải giọng đang chọn', async () => {
    const spoken = stubSynth(VOICES)
    useVoice.setState({ voiceURI: 'Tingting' })
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /Phát âm Kangkang/ }))

    // Đây là chỗ dễ cài sai nhất: quên tham số ghi đè thì mọi nút nghe thử đều
    // phát bằng giọng đang chọn, và cả màn này thành đồ trang trí.
    expect(spoken.at(-1)?.voice?.name).toBe('Kangkang')
  })

  it('nghe thử mục Tự động phát bằng giọng chấm điểm, kể cả khi đang lưu giọng khác', async () => {
    const spoken = stubSynth(VOICES)
    useVoice.setState({ voiceURI: 'Meijia' })
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /Phát âm Tự động/ }))

    expect(spoken.at(-1)?.voice?.name).toBe('Tingting')
  })

  it('máy không có giọng tiếng Trung thì giải thích lý do thay vì hiện danh sách rỗng', () => {
    stubSynth([voice('Samantha', 'en-US')])
    renderPage()

    expect(screen.getByText('Thiết bị chưa có giọng tiếng Trung')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('giọng đã lưu không còn trên máy thì quay về Tự động và nói rõ, không xoá lựa chọn cũ', () => {
    stubSynth(VOICES)
    useVoice.setState({ voiceURI: 'Giọng của máy cũ' })
    renderPage()

    expect(screen.getByRole('radio', { name: /Tự động/ })).toBeChecked()
    expect(screen.getByText(/không có trên thiết bị này/i)).toBeInTheDocument()

    // Lựa chọn cũ phải còn nguyên: người dùng mở lại trên máy cũ thì giọng của
    // họ vẫn ở đó.
    expect(useVoice.getState().voiceURI).toBe('Giọng của máy cũ')
  })
})

describe('ca rìa', () => {
  it('máy không có giọng nào và không bao giờ bắn voiceschanged thì vẫn kết luận được', () => {
    // `voiceschanged` chỉ bắn khi danh sách ĐỔI. Máy chưa cài giọng nào thì nó
    // im lặng vĩnh viễn — và đó đúng là thiết bị cần lời giải thích nhất.
    vi.useFakeTimers()

    try {
      stubSynth([])
      renderPage()
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(screen.getByText('Thiết bị chưa có giọng tiếng Trung')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('không dựng hai hàng cho hai giọng trùng voiceURI', () => {
    const twin = { ...voice('Tingting', 'zh-CN'), voiceURI: 'shared' }
    const other = { ...voice('Tingting Đài', 'zh-TW'), voiceURI: 'shared' }
    stubSynth([twin, other])
    renderPage()

    // Trùng khoá thì React cảnh báo, hai radio cùng được chọn, và mũi tên không
    // bao giờ tới được hàng thứ hai.
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1)
  })

  it('giọng có voiceURI rỗng thì quy về Tự động, không tô sáng một hàng rồi phát giọng khác', async () => {
    const spoken = stubSynth([{ ...voice('Giọng không tên', 'zh-CN'), voiceURI: '' }])
    renderPage()

    await userEvent.click(screen.getByRole('radio', { name: /^Giọng không tên/ }))

    // `speak()` coi chuỗi rỗng là falsy nên rơi về chấm điểm. Nếu store giữ
    // nguyên chuỗi rỗng thì màn hình nói "đang dùng giọng này", tai nghe giọng
    // khác, và không có dấu hiệu nào.
    expect(useVoice.getState().voiceURI).toBeNull()
    expect(screen.getByRole('radio', { name: /Tự động/ })).toBeChecked()
    expect(spoken).toHaveLength(0)
  })
})

describe('bàn phím', () => {
  it('cả nhóm chỉ có MỘT điểm dừng Tab', () => {
    stubSynth(VOICES)
    renderPage()

    const focusable = screen.getAllByRole('radio').filter((radio) => radio.tabIndex === 0)

    // Để mọi hàng cùng nhận Tab thì người dùng bàn phím phải Tab qua cả danh
    // sách giọng mới ra khỏi nhóm.
    expect(focusable).toHaveLength(1)
  })

  it('mũi tên bấm trên nút nghe thử KHÔNG đổi giọng đã lưu', async () => {
    stubSynth(VOICES)
    renderPage()

    screen.getByRole('button', { name: /Phát âm Tự động/ }).focus()
    await userEvent.keyboard('{ArrowDown}')

    // Nút nghe thử nằm trong nhóm nên phím của nó nổi lên tới `radiogroup`.
    // Không lọc theo nguồn thì một thao tác cuộn danh sách lại ghi đè cài đặt.
    expect(useVoice.getState().voiceURI).toBeNull()
  })

  it('mũi tên xuống chuyển sang lựa chọn kế tiếp', async () => {
    stubSynth(VOICES)
    renderPage()

    const auto = screen.getByRole('radio', { name: /Tự động/ })
    auto.focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(screen.getByRole('radio', { name: /^Tingting/ })).toBeChecked()
  })

  it('mũi tên lên từ mục đầu vòng về mục cuối', async () => {
    stubSynth(VOICES)
    renderPage()

    screen.getByRole('radio', { name: /Tự động/ }).focus()
    await userEvent.keyboard('{ArrowUp}')

    // Mũi tên trong radiogroup không được đi vào ngõ cụt.
    expect(screen.getByRole('radio', { name: /Kangkang/ })).toBeChecked()
  })
})

describe('a11y', () => {
  it('không có vi phạm axe', async () => {
    stubSynth(VOICES)
    const { container } = renderPage()

    expect((await axe(container)).violations).toEqual([])
  })
})
