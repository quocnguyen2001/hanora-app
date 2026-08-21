import { useState } from 'react'
import { useNavigate } from 'react-router'
import { VocabularyCard } from '@/components/common/VocabularyCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchBar } from '@/components/ui/SearchBar'
import { Tabs } from '@/components/ui/Tabs'
import { VocabularyCardSkeleton } from '@/components/ui/Skeleton'
import { useSavedWordIds, useToggleSaveWord } from '@/features/vocabulary/hooks'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useRecentSearches } from '@/stores/recent-searches'
import { useSearchMode, type SearchMode, type SearchModeChoice } from '@/stores/search-mode'
import { usePrefetchWord, useSearchWords } from '../hooks'

/*
 * KHÔNG có hàng tab `Tất cả | Từ vựng | Ví dụ | Hán tự` của showcase.
 *
 * Hai tab cuối đã bị loại khỏi MVP từ contract. Hai tab đầu thì trả về ĐÚNG
 * CÙNG MỘT tập kết quả — mọi mục trong `dictionary_words` đều là từ vựng, và
 * câu ví dụ chỉ tới ở P13. Ship hai tab cho ra kết quả giống hệt nhau là một
 * nút chết, cùng loại với nút camera và tab Thống kê mà plan đã cắt.
 *
 * Toggle VI/CN bên dưới KHÔNG mâu thuẫn với quyết định đó — nó thỏa đúng tiêu
 * chí mà quyết định đó đặt ra. Cùng chuỗi `xin chào`: `vi` ra 你好, `cn` ra 新潮.
 * Nó đổi thật sự nhánh nào chạy phía API, chứ không phải hai nhãn trên cùng một
 * tập kết quả.
 */
const MODES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'cn', label: '中文' },
] as const

/**
 * Mode còn lại, để gợi ý khi không tìm thấy gì.
 *
 * Khi CHƯA chọn mode (`null`, đường auto) thì gợi ý `Tiếng Việt` — đó là mode
 * hữu ích nhất cho một truy vấn mà bộ đoán vừa bó tay.
 */
const OTHER_MODE: Record<'vi' | 'cn' | 'auto', SearchMode> = { vi: 'cn', cn: 'vi', auto: 'vi' }

const MODE_LABEL: Record<SearchMode, string> = { vi: 'Tiếng Việt', cn: '中文' }

export function SearchPage() {
  const [input, setInput] = useState('')
  const navigate = useNavigate()
  const prefetchWord = usePrefetchWord()
  const recent = useRecentSearches()
  const { mode, setMode } = useSearchMode()

  // Hoãn 250ms: gõ `học tập` mà gọi mỗi phím là 7 request, 6 cái vô ích.
  const query = useDebouncedValue(input.trim())
  const search = useSearchWords(query, mode)
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
        {/*
          `value={mode ?? ''}` — chưa chọn thì KHÔNG pill nào sáng, và request
          không gửi `mode` nên API chạy đường auto. Toggle là lựa chọn đè lên
          phỏng đoán, không phải mặc định áp đặt.
        */}
        <Tabs
          items={MODES}
          value={mode ?? ''}
          onChange={(value) => setMode(value as SearchMode)}
          label="Ngôn ngữ tìm kiếm"
        />
      </header>

      <SearchResults
        query={query}
        mode={mode}
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
  mode,
  state,
  savedIds,
  onOpen,
  onPrefetch,
  onToggleSave,
  onRetry,
}: {
  query: string
  mode: SearchModeChoice
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

  /*
   * `placeholderData` giữ danh sách CŨ trong lúc tải danh sách mới, và nó áp
   * dụng cả khi query key đổi — tức là lúc bấm toggle, màn hình vẫn hiện kết quả
   * của mode TRƯỚC. `isPending` lúc đó là `false` nên khung xương ở trên không
   * chạy, và toggle trông như hỏng đúng cái kiểu mà việc đưa `mode` vào query
   * key sinh ra để tránh.
   *
   * Làm mờ danh sách cũ là đủ: giữ được ngữ cảnh, mà vẫn nói rõ "đang tải".
   */
  const stale = state.isPlaceholderData

  const words = state.data?.words ?? []

  if (words.length === 0) {
    /*
     * `hv_not_found`: gõ tiếng Việt mà KHÔNG nhánh nào khớp được — không âm
     * Hán-Việt, không nghĩa tiếng Việt, không gì cả.
     *
     * Hint này KHÔNG phân biệt được hai lý do, và không thể sửa cho nó phân biệt
     * mà không thêm một truy vấn đếm thứ hai. Nó cũng IM LẶNG khi cầu nối nghĩa
     * Việt trả về kết quả kém: có kết quả nghĩa là `total > 0` nghĩa là không có
     * hint, kể cả khi kết quả đó chẳng liên quan gì.
     *
     * Vì thế câu chữ ở đây KHÔNG được hứa phân biệt lý do. Nói đúng thứ app
     * biết: không tìm thấy, thử cách viết khác.
     */
    const hint = state.data?.meta.hint

    /*
     * Rủi ro thật của toggle là chọn sai mode rồi không ra gì. Gợi ý mode còn
     * lại ngay tại chỗ người dùng đang bế tắc, thay vì để họ tự đoán.
     */
    const trySwitching = `Hoặc thử tìm bằng ${MODE_LABEL[OTHER_MODE[mode ?? 'auto']]}.`

    return (
      <EmptyState
        title="Không tìm thấy từ nào."
        description={
          hint === 'hv_not_found'
            ? `Từ này có thể chưa có trong dữ liệu. Thử một cách viết khác. ${trySwitching}`
            : `Thử một cách viết khác. ${trySwitching}`
        }
      />
    )
  }

  return (
    <ul className={cn('space-y-3 transition-opacity', stale && 'opacity-50')} aria-busy={stale}>
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
        description="Gõ chữ Hán, pinyin, âm Hán-Việt, hoặc nghĩa tiếng Việt — ví dụ 学习, xuexi, học tập, hoặc con mèo. 🌸"
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
