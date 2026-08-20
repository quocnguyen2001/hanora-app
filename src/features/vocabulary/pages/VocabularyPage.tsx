import { useState } from 'react'
import { useNavigate } from 'react-router'
import { VocabularyCard } from '@/components/common/VocabularyCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchBar } from '@/components/ui/SearchBar'
import { VocabularyCardSkeleton } from '@/components/ui/Skeleton'
import { Tabs } from '@/components/ui/Tabs'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { ApiError } from '@/lib/api'
import { useToggleSaveWord, useVocabulary } from '../hooks'

/**
 * Bốn tab, khớp ĐÚNG bảng map trong `plan.md` và `UserWord::TAB_STATUSES` phía
 * API — một nguồn duy nhất cho P11, P12, P14, P16.
 *
 * "Đang học" gộp `learning` + `reviewing`. Bỏ tab này sẽ làm mọi từ đã ôn một
 * lần biến mất khỏi bộ lọc suốt tháng đầu, vì `mastered` cần
 * `interval_days >= 30`.
 */
const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'new', label: 'Chưa học' },
  { value: 'learning', label: 'Đang học' },
  { value: 'mastered', label: 'Đã học' },
] as const

export function VocabularyPage() {
  const [tab, setTab] = useState<string>('')
  const [input, setInput] = useState('')
  const navigate = useNavigate()

  const query = useDebouncedValue(input.trim())
  const filters = { status: tab === '' ? undefined : tab, q: query === '' ? undefined : query }

  const vocabulary = useVocabulary(filters)
  const toggleSave = useToggleSaveWord()

  const items = vocabulary.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">Kho từ</h1>
        <SearchBar
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onClear={() => setInput('')}
          placeholder="Tìm trong kho từ..."
        />
        <Tabs items={TABS} value={tab} onChange={setTab} label="Lọc kho từ" />
      </header>

      {vocabulary.isPending ? (
        <div aria-busy className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <VocabularyCardSkeleton key={index} />
          ))}
        </div>
      ) : vocabulary.isError ? (
        <EmptyState
          title={
            vocabulary.error instanceof ApiError && vocabulary.error.isNetworkError
              ? 'Đang ngoại tuyến'
              : 'Không tải được kho từ'
          }
          description="Thử lại giúp mình nhé."
          action={<Button onClick={() => void vocabulary.refetch()}>Thử lại</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyStateForTab
          tab={tab}
          searching={query !== ''}
          onGoSearch={() => void navigate('/search')}
        />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <VocabularyCard
                  word={item.word}
                  saved
                  onSelect={() => void navigate(`/words/${item.word.id}`)}
                  onToggleSave={() =>
                    // Đã ở trong kho nên đây luôn là thao tác BỎ lưu; truyền
                    // `id` của bản ghi kho, không phải `word_id`.
                    toggleSave.mutate({ wordId: item.word.id, userWordId: item.id })
                  }
                />
              </li>
            ))}
          </ul>

          {vocabulary.hasNextPage && (
            <Button
              variant="secondary"
              fullWidth
              loading={vocabulary.isFetchingNextPage}
              onClick={() => void vocabulary.fetchNextPage()}
            >
              Tải thêm
            </Button>
          )}
        </>
      )}
    </div>
  )
}

/** Empty state ấm áp theo `ux-rules.md`, và nói đúng ngữ cảnh của từng tab. */
function EmptyStateForTab({
  tab,
  searching,
  onGoSearch,
}: {
  tab: string
  searching: boolean
  onGoSearch: () => void
}) {
  if (searching) {
    return <EmptyState title="Không có từ nào khớp." description="Thử một từ khóa khác." />
  }

  if (tab === '') {
    return (
      <EmptyState
        title="Chưa có từ nào trong kho."
        description="Hãy tìm một từ bạn muốn nhớ hôm nay 🌸"
        action={<Button onClick={onGoSearch}>Tìm từ đầu tiên</Button>}
      />
    )
  }

  const messages: Record<string, string> = {
    new: 'Mọi từ trong kho đều đã được ôn ít nhất một lần. Giỏi lắm!',
    learning: 'Chưa có từ nào đang trong nhịp ôn. Lưu thêm từ rồi bắt đầu ôn tập nhé.',
    mastered: 'Chưa có từ nào đạt mức đã học. Cứ ôn đều, rồi sẽ tới.',
  }

  return <EmptyState title="Chưa có từ nào ở mục này." description={messages[tab]} />
}
