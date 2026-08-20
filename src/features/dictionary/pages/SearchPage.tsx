import { useState } from 'react'
import { useNavigate } from 'react-router'
import { VocabularyCard } from '@/components/common/VocabularyCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchBar } from '@/components/ui/SearchBar'
import { VocabularyCardSkeleton } from '@/components/ui/Skeleton'
import { useSavedWordIds, useToggleSaveWord } from '@/features/vocabulary/hooks'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { ApiError } from '@/lib/api'
import { useRecentSearches } from '@/stores/recent-searches'
import { usePrefetchWord, useSearchWords } from '../hooks'

/*
 * KHÔNG có hàng tab ở màn này.
 *
 * Showcase vẽ `Tất cả | Từ vựng | Ví dụ | Hán tự`. Hai tab cuối đã bị loại khỏi
 * MVP từ contract. Hai tab đầu thì ở MVP trả về ĐÚNG CÙNG MỘT tập kết quả — mọi
 * mục trong `dictionary_words` đều là từ vựng, và câu ví dụ chỉ tới ở P13.
 *
 * Ship hai tab cho ra kết quả giống hệt nhau là một nút chết, cùng loại với nút
 * camera và tab Thống kê mà plan đã cắt vì đúng lý do đó. Thêm lại khi P13 làm
 * cho "Ví dụ" có nội dung thật.
 */
export function SearchPage() {
  const [input, setInput] = useState('')
  const navigate = useNavigate()
  const prefetchWord = usePrefetchWord()
  const recent = useRecentSearches()

  // Hoãn 250ms: gõ `học tập` mà gọi mỗi phím là 7 request, 6 cái vô ích.
  const query = useDebouncedValue(input.trim())
  const search = useSearchWords(query)
  const savedIds = useSavedWordIds()
  const toggleSave = useToggleSaveWord()

  function openWord(id: number) {
    recent.add(query)
    void navigate(`/words/${id}`)
  }

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">Tìm kiếm</h1>
        <SearchBar
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onClear={() => setInput('')}
          autoFocus
        />
      </header>

      <SearchResults
        query={query}
        state={search}
        savedIds={savedIds.data}
        onOpen={openWord}
        onPrefetch={prefetchWord}
        onToggleSave={(wordId) => toggleSave.mutate({ wordId, userWordId: null })}
        onRetry={() => void search.refetch()}
      />
    </div>
  )
}

function SearchResults({
  query,
  state,
  savedIds,
  onOpen,
  onPrefetch,
  onToggleSave,
  onRetry,
}: {
  query: string
  state: ReturnType<typeof useSearchWords>
  savedIds: Set<number> | undefined
  onOpen: (id: number) => void
  onPrefetch: (id: number) => void
  onToggleSave: (wordId: number) => void
  onRetry: () => void
}) {
  const recent = useRecentSearches()

  // Ô rỗng → lịch sử tìm kiếm, không phải màn trắng.
  if (query === '') {
    return <RecentSearches items={recent.items} onClear={recent.clear} />
  }

  if (state.isPending) {
    return (
      <div aria-busy className="space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <VocabularyCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (state.isError) {
    const offline = state.error instanceof ApiError && state.error.isNetworkError

    return (
      <EmptyState
        title={offline ? 'Đang ngoại tuyến' : 'Không tải được kết quả'}
        description={
          offline
            ? 'Kiểm tra kết nối mạng rồi thử lại. Kho từ đã lưu vẫn xem được.'
            : 'Có lỗi khi tìm từ. Thử lại giúp mình nhé.'
        }
        action={<Button onClick={onRetry}>Thử lại</Button>}
      />
    )
  }

  const words = state.data?.words ?? []

  if (words.length === 0) {
    /*
     * `hv_not_found`: người dùng gõ tiếng Việt nhưng không khớp âm Hán-Việt nào.
     *
     * Độ phủ Hán-Việt chưa 100%, nên "không thấy" có thể do DỮ LIỆU chứ không
     * phải do họ gõ sai. Nói đúng chuyện đó thay vì để họ nghĩ mình nhớ nhầm từ.
     */
    const hint = state.data?.meta.hint

    return (
      <EmptyState
        title="Không tìm thấy từ nào."
        description={
          hint === 'hv_not_found'
            ? 'Có thể từ này chưa có âm Hán-Việt trong dữ liệu. Thử tìm bằng chữ Hán hoặc pinyin xem sao.'
            : 'Thử một cách viết khác, hoặc tìm bằng pinyin.'
        }
      />
    )
  }

  return (
    <ul className="space-y-3">
      {words.map((word) => (
        <li key={word.id} onMouseEnter={() => onPrefetch(word.id)}>
          <VocabularyCard
            word={word}
            variant="compact"
            // Trạng thái đã lưu lấy từ `/vocabulary/ids`, KHÔNG từ response tìm
            // kiếm — response từ điển không mang trường theo user (C2).
            saved={savedIds?.has(word.id) ?? false}
            onSelect={() => onOpen(word.id)}
            onToggleSave={() => onToggleSave(word.id)}
          />
        </li>
      ))}
    </ul>
  )
}

function RecentSearches({ items, onClear }: { items: string[]; onClear: () => void }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Bắt đầu tra từ"
        description="Gõ chữ Hán, pinyin hoặc âm Hán-Việt — ví dụ 学习, xuexi, hoặc học tập. 🌸"
      />
    )
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-section">Gần đây</h2>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Xóa
        </Button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item}>
            <span className="bg-primary-pale text-body text-text-secondary inline-flex rounded-full px-3 py-2">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
