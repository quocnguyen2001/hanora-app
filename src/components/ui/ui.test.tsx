import { render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchIcon } from '@/components/icons'
import type { WordSummary } from '@/types/dictionary'
import { AudioButton } from '../common/AudioButton'
import { HanViet } from '../common/HanViet'
import { VocabularyCard } from '../common/VocabularyCard'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { SearchBar } from './SearchBar'
import { Tabs } from './Tabs'
import { TabView } from './TabView'

const word: WordSummary = {
  id: 1,
  simplified: '学习',
  traditional: '學習',
  pinyin: 'xuéxí',
  han_viet: 'học tập',
  definitions_en: ['to learn', 'to study'],
  definitions_vi: ['học', 'tìm hiểu'],
  measure_words: [],
  hsk_level: 1,
}

describe('Button', () => {
  it('không bấm được và báo aria-busy khi đang loading', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Lưu
      </Button>,
    )

    const button = screen.getByRole('button', { name: /Lưu/ })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('gọi onClick khi bình thường', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Lưu</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe('IconButton', () => {
  it('luôn có accessible name từ label', () => {
    // Nút chỉ có icon mà không có tên gọi thì screen reader chỉ đọc "button".
    render(<IconButton label="Phát âm" icon={<SearchIcon />} />)

    expect(screen.getByRole('button', { name: 'Phát âm' })).toBeInTheDocument()
  })

  it('có touch target ít nhất 44px', () => {
    render(<IconButton label="Phát âm" icon={<SearchIcon />} />)

    // size-11 = 44px, ngưỡng tối thiểu cho mục tiêu chạm.
    expect(screen.getByRole('button')).toHaveClass('size-11')
  })
})

describe('SearchBar', () => {
  it('KHÔNG có nút camera — tìm bằng ảnh nằm ngoài MVP', () => {
    // Ship một nút không làm gì còn tệ hơn không có nút.
    render(<SearchBar value="" onChange={() => {}} />)

    expect(screen.queryByRole('button', { name: /camera|ảnh|chụp/i })).not.toBeInTheDocument()
  })

  it('chỉ hiện nút xóa khi đã có chữ', async () => {
    const onClear = vi.fn()
    const { rerender } = render(<SearchBar value="" onChange={() => {}} onClear={onClear} />)

    expect(screen.queryByRole('button', { name: 'Xóa từ khóa' })).not.toBeInTheDocument()

    rerender(<SearchBar value="学习" onChange={() => {}} onClear={onClear} />)
    await userEvent.click(screen.getByRole('button', { name: 'Xóa từ khóa' }))

    expect(onClear).toHaveBeenCalledOnce()
  })

  it('dùng placeholder tiếng Việt theo thiết kế', () => {
    render(<SearchBar value="" onChange={() => {}} />)

    expect(screen.getByPlaceholderText('Tìm từ vựng tiếng Trung...')).toBeInTheDocument()
  })
})

describe('AudioButton', () => {
  it('disable kèm nhãn giải thích khi thiết bị không hỗ trợ', () => {
    // R4: Web Speech API không đảm bảo có giọng zh-CN. Không để nút chết.
    render(<AudioButton state="unsupported" />)

    const button = screen.getByRole('button', {
      name: 'Thiết bị không hỗ trợ phát âm tiếng Trung',
    })

    expect(button).toBeDisabled()
  })

  it('gọi onPlay khi bấm', async () => {
    const onPlay = vi.fn()
    render(<AudioButton onPlay={onPlay} />)

    await userEvent.click(screen.getByRole('button', { name: 'Phát âm' }))
    expect(onPlay).toHaveBeenCalledOnce()
  })
})

describe('HanViet', () => {
  it('ẩn HẲN khi không có âm, không render chuỗi rỗng', () => {
    // Một dòng trống trông như lỗi giao diện; bịa âm thì tệ hơn vì người học
    // sẽ nhớ cái sai.
    const { container } = render(<HanViet>{null}</HanViet>)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('VocabularyCard', () => {
  it('hiện đủ chữ Hán, pinyin, âm Hán-Việt VÀ định nghĩa tiếng Anh', () => {
    // R1: âm Hán-Việt không bao giờ thay thế định nghĩa tiếng Anh.
    render(<VocabularyCard word={word} />)

    expect(screen.getByText('学习')).toBeInTheDocument()
    expect(screen.getByText('xuéxí')).toBeInTheDocument()
    expect(screen.getByText('học tập')).toBeInTheDocument()
    expect(screen.getByText('to learn; to study')).toBeInTheDocument()
  })

  it('vẫn hiện định nghĩa tiếng Anh khi chưa có âm Hán-Việt', () => {
    render(<VocabularyCard word={{ ...word, han_viet: null }} />)

    expect(screen.queryByText('học tập')).not.toBeInTheDocument()
    expect(screen.getByText('to learn; to study')).toBeInTheDocument()
  })

  it('hiện nghĩa tiếng Việt TRƯỚC định nghĩa tiếng Anh', () => {
    /*
     * Thứ tự là ràng buộc, không phải sở thích: người học Việt đọc nghĩa Việt
     * trước. Chốt bằng vị trí trong DOM chứ không chỉ bằng sự có mặt — cả hai
     * cùng có mặt thì `getByText` xanh dù đảo thứ tự.
     */
    render(<VocabularyCard word={word} />)

    const vi = screen.getByText('học')
    const en = screen.getByText('to learn; to study')

    expect(vi.compareDocumentPosition(en) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('ẩn HẲN nghĩa tiếng Việt khi null, không để khung trống', () => {
    // ~7% từ không có trong CVDICT. Chúng phải hiển thị bình thường bằng tiếng
    // Anh, đúng như trước khi có nghĩa tiếng Việt.
    const { container } = render(<VocabularyCard word={{ ...word, definitions_vi: null }} />)

    expect(screen.queryByText('học')).not.toBeInTheDocument()
    expect(screen.getByText('to learn; to study')).toBeInTheDocument()
    expect(container.querySelectorAll('span:empty')).toHaveLength(0)
  })

  it('thẻ chỉ lấy nghĩa Việt ĐẦU TIÊN', () => {
    // CVDICT thừa hưởng ghi chú lượng từ của CC-CEDICT làm nghĩa riêng — 狗 là
    // `["chó", "LT:隻|只[zhi1],條|条[tiao2]"]`. Lấy hai nghĩa thì dòng đầu người
    // học đọc được là "chó; LT:隻|只[zhi1]".
    render(<VocabularyCard word={{ ...word, definitions_vi: ['chó', 'LT:隻|只[zhi1]'] }} />)

    expect(screen.getByText('chó')).toBeInTheDocument()
    expect(screen.queryByText(/LT:/)).not.toBeInTheDocument()
  })

  it('nhãn nút lưu nói HÀNH ĐỘNG sẽ xảy ra, không phải trạng thái', async () => {
    const onToggleSave = vi.fn()
    const { rerender } = render(<VocabularyCard word={word} onToggleSave={onToggleSave} />)

    await userEvent.click(screen.getByRole('button', { name: 'Lưu 学习' }))
    expect(onToggleSave).toHaveBeenCalledOnce()

    rerender(<VocabularyCard word={word} saved onToggleSave={onToggleSave} />)
    expect(screen.getByRole('button', { name: 'Bỏ lưu 学习' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('hiện badge HSK khi có', () => {
    render(<VocabularyCard word={word} />)

    expect(screen.getByText('HSK 1')).toBeInTheDocument()
  })
})

describe('Tabs', () => {
  it('dùng role tablist và đánh dấu tab đang chọn', () => {
    // Một hàng button không có vai trò sẽ khiến screen reader đọc ra các nút
    // rời rạc, không nói được cái nào đang chọn.
    render(
      <Tabs
        label="Lọc kho từ"
        value="all"
        onChange={() => {}}
        items={[
          { value: 'all', label: 'Tất cả' },
          { value: 'new', label: 'Chưa học' },
        ]}
      />,
    )

    const tablist = screen.getByRole('tablist', { name: 'Lọc kho từ' })

    expect(within(tablist).getByRole('tab', { name: 'Tất cả' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(within(tablist).getByRole('tab', { name: 'Chưa học' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })
})

describe('TabView', () => {
  const ITEMS = [
    { value: 'a', label: 'Nghĩa', panel: <p>nội dung nghĩa</p> },
    { value: 'b', label: 'Hán tự', panel: <p>nội dung hán tự</p> },
    { value: 'c', label: 'Ví dụ', panel: <p>nội dung ví dụ</p> },
  ]

  /** Bọc state thật: `TabView` là controlled, test nào giữ `value` cứng là test rỗng. */
  function Harness({ initial = 'a' }: { initial?: string }) {
    const [value, setValue] = useState(initial)

    return <TabView items={ITEMS} value={value} onChange={setValue} label="Nội dung từ" />
  }

  it('nối tab với panel bằng aria-controls và aria-labelledby', () => {
    // Nửa thường bị quên của mẫu tab. Thiếu nó thì screen reader đọc ra một hàng
    // nút và một khối chữ, không nói được khối đó THUỘC nút nào.
    render(<Harness />)

    const tab = screen.getByRole('tab', { name: 'Nghĩa' })
    const panel = screen.getByRole('tabpanel')

    expect(tab).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', tab.id)
  })

  it('chỉ MỘT điểm dừng Tab trong cả nhóm — roving tabindex', () => {
    /*
     * Để cả ba tab cùng nhận Tab thì người dùng bàn phím phải Tab qua hết thanh
     * tab mới tới được nội dung, ở MỌI lần đổi tab. Cùng luật mà `Segmented`
     * đang giữ cho nhóm radio.
     */
    render(<Harness />)

    const tabs = screen.getAllByRole('tab')

    expect(tabs.map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
  })

  it('mũi tên đổi tab, dời focus theo, và vòng lại ở hai đầu', async () => {
    const user = userEvent.setup()

    render(<Harness />)

    await user.click(screen.getByRole('tab', { name: 'Nghĩa' }))
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: 'Hán tự' })).toHaveFocus()
    expect(screen.getByText('nội dung hán tự')).toBeInTheDocument()

    // Vòng lại: mũi tên trong tablist không được đi vào ngõ cụt.
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Ví dụ' })).toHaveFocus()
    expect(screen.getByText('nội dung ví dụ')).toBeInTheDocument()
  })

  it('Home và End nhảy về hai đầu', async () => {
    const user = userEvent.setup()

    render(<Harness initial="b" />)

    await user.click(screen.getByRole('tab', { name: 'Hán tự' }))
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Ví dụ' })).toHaveFocus()

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Nghĩa' })).toHaveFocus()
  })

  it('panel không hoạt động bị UNMOUNT, không phải ẩn bằng CSS', () => {
    /*
     * Ẩn bằng CSS để lại nội dung trong cây a11y và trong truy vấn của test —
     * một khối chữ mà người dùng screen reader vẫn đọc được dù tab của nó đang
     * đóng. Đây là bất biến mà `WordDetailPage` dựa vào để hai panel nặng
     * (bảng Hán tự, danh sách câu) không cùng tồn tại.
     */
    render(<Harness />)

    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    expect(screen.queryByText('nội dung hán tự')).not.toBeInTheDocument()
  })
})
