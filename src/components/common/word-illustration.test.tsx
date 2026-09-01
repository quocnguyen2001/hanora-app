import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { WordIllustration as WordIllustrationData } from '@/types/dictionary'
import { WordIllustration } from './WordIllustration'

const useWordIllustration = vi.hoisted(() => vi.fn())

vi.mock('@/features/dictionary/hooks', () => ({ useWordIllustration }))

const illustration: WordIllustrationData = {
  url: 'https://cdn.pixabay.com/photo/x/y_640.jpg',
  preview_url: 'https://cdn.pixabay.com/photo/x/y_150.jpg',
  width: 640,
  height: 426,
  author: 'NoName_13',
  author_url: 'https://pixabay.com/users/NoName_13-2364555/',
  page_url: 'https://pixabay.com/photos/y/',
  source: 'pixabay',
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function renderWith(data: unknown) {
  useWordIllustration.mockReturnValue({ data })

  return render(<WordIllustration wordId={1} />, { wrapper })
}

describe('WordIllustration', () => {
  it('hiện ảnh kèm ghi công khi có dữ liệu', () => {
    const { container } = renderWith({ illustration, status: 'ready' })

    expect(container.querySelector('img')).toHaveAttribute('src', illustration.url)
    // Ghi công là nghĩa vụ ToS Pixabay, không phải chi tiết trang trí.
    expect(screen.getByRole('link', { name: 'Pixabay' })).toHaveAttribute(
      'href',
      illustration.page_url,
    )
    expect(screen.getByText(/NoName_13/)).toBeInTheDocument()
  })

  it('mở link nguồn an toàn trong tab mới', () => {
    renderWith({ illustration, status: 'ready' })

    expect(screen.getByRole('link', { name: 'Pixabay' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    )
  })

  it('ẩn ảnh khỏi screen reader vì nghĩa đã có bằng chữ ngay dưới', () => {
    // Đặt `alt` bằng chữ Hán hay nghĩa Việt sẽ khiến screen reader đọc lặp.
    const { container } = renderWith({ illustration, status: 'ready' })
    const img = container.querySelector('img')

    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('aria-hidden', 'true')
  })

  it('giữ placeholder khi cổng đã đóng — không phải lỗi', () => {
    // Hư từ và từ trừu tượng rơi vào đây. Đây là kết cục thường gặp và bình
    // thường, không được hiện khối lỗi.
    const { container } = renderWith({ illustration: null, status: 'none' })

    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByText(/Pixabay/)).not.toBeInTheDocument()
  })

  it('giữ placeholder trong lúc còn đang tìm ảnh', () => {
    const { container } = renderWith({ illustration: null, status: 'pending' })

    expect(container.querySelector('img')).toBeNull()
  })

  it('giữ placeholder khi hook chưa có dữ liệu', () => {
    const { container } = renderWith(undefined)

    expect(container.querySelector('img')).toBeNull()
  })

  it('không gọi API ảnh khi hero được truyền illustration sẵn', async () => {
    /*
     * Hồi quy cho trang gallery thiết kế: hero render một từ MẪU (`id: 1`), nên
     * để nó tự gọi API sẽ tạo bản ghi và xếp một job Pixabay thật cho một từ
     * chẳng liên quan — mỗi lần ai đó mở gallery.
     */
    useWordIllustration.mockClear()

    const { WordDetailHero } = await import('./WordDetailHero')

    render(
      <WordDetailHero
        word={{
          id: 1,
          simplified: '学习',
          traditional: '學習',
          pinyin: 'xuéxí',
          han_viet: 'học tập',
          definitions_en: ['to learn'],
          definitions_vi: ['học'],
          measure_words: [],
          hsk_level: 1,
        }}
        illustration={<div data-testid="illustration-thay-the" />}
      />,
      { wrapper },
    )

    expect(screen.getByTestId('illustration-thay-the')).toBeInTheDocument()
    expect(useWordIllustration).not.toHaveBeenCalled()
  })

  it('rơi về placeholder khi ảnh tải hỏng', () => {
    /*
     * KHÔNG phải phòng xa thừa: app cache URL vĩnh viễn cho một tài nguyên
     * mình không sở hữu. Pixabay gỡ ảnh, hoặc bản `_640` suy ra được lại không
     * tồn tại, thì ô ảnh vỡ ngay giữa hero.
     */
    const { container } = renderWith({ illustration, status: 'ready' })
    const img = container.querySelector('img')

    expect(img).not.toBeNull()
    fireEvent.error(img!)

    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByText(/Pixabay/)).not.toBeInTheDocument()
  })
})
