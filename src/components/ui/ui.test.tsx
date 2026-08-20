import { render, screen, within } from '@testing-library/react'
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

const word: WordSummary = {
  id: 1,
  simplified: '学习',
  traditional: '學習',
  pinyin: 'xuéxí',
  han_viet: 'học tập',
  definitions_en: ['to learn', 'to study'],
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
