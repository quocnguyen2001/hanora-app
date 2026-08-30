import { useState } from 'react'
import { useNavigate } from 'react-router'
import { VocabularyCard } from '@/components/common/VocabularyCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchBar } from '@/components/ui/SearchBar'
import { Tabs } from '@/components/ui/Tabs'
import { VocabularyListSkeleton } from '@/components/ui/PageSkeleton'
import { useSavedWordIds, useToggleSaveWord } from '@/features/vocabulary/hooks'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useRecentSearches } from '@/stores/recent-searches'
import { useSearchMode, type SearchMode, type SearchModeChoice } from '@/stores/search-mode'
import { TranslationCard } from '../components/TranslationCard'
import { isSearchableQuery, usePrefetchWord, useSearchWords } from '../hooks'

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
/*
 * `Tự động` là một pill THẬT, không phải trạng thái ngầm.
 *
 * Trước đây chỉ có hai pill và `value={mode ?? ''}`, nên lúc chưa chọn thì KHÔNG
 * pill nào sáng. Chủ đích đúng — toggle là lựa chọn đè lên phỏng đoán, không
 * phải mặc định áp đặt — nhưng kết quả thị giác là người dùng không phân biệt
 * được "đang chạy đường auto" với "hàng nút này hỏng".
 *
 * Ba pill thì luôn có đúng một cái sáng. Ngữ nghĩa không đổi: `''` vẫn quy về
 * `null`, request vẫn không mang `mode`, API vẫn chạy đường auto.
 */
const MODES = [
  { value: '', label: 'Tự động' },
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

  /*
   * Hoãn 400ms, dài hơn mặc định 250ms của hook.
   *
   * Gõ tiếng Việt có dấu là nhiều phím cho một chữ (`hoc5` → `học`), nên 250ms
   * vẫn kịp bắn request cho những trạng thái nửa chừng không ai muốn tra. Mỗi
   * lượt tìm còn kéo theo một lượt dịch bằng AI ở phía API, nên một request thừa
   * đắt hơn hẳn 150ms chờ thêm.
   */
  const query = useDebouncedValue(input.trim(), 400)
  const search = useSearchWords(query, mode)
  const savedIds = useSavedWordIds()
  const toggleSave = useToggleSaveWord()

  function openWord(id: number) {
    recent.add(query)
    void navigate(`/words/${id}`)
  }

  /*
   * Câu đi vào query string, KHÔNG phải path param: nó không có id, và một câu
   * có thể chứa ký tự làm vỡ path. `URLSearchParams` mã hoá giúp, nên không cần
   * `encodeURIComponent` thủ công — làm cả hai sẽ mã hoá hai lần.
   */
  function openSentence(zh: string) {
    recent.add(query)
    void navigate(`/sentence?${new URLSearchParams({ zh }).toString()}`)
  }

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <h1 className="text-title">Tìm kiếm</h1>
        <SearchBar
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onClear={() => setInput('')}
          autoFocus
        />
        {/*
          `''` ↔ `null`: pill `Tự động` không gửi `mode` nên API chạy đường auto.
          Quy đổi ở đây chứ không ở store — `''` là chuyện của `Tabs`, thứ cần
          một chuỗi để so sánh; `null` là chuyện của hợp đồng API.
        */}
        <Tabs
          items={MODES}
          value={mode ?? ''}
          onChange={(value) => setMode(value === '' ? null : (value as SearchMode))}
          label="Ngôn ngữ tìm kiếm"
        />
      </header>

      <SearchResults
        query={query}
        mode={mode}
        state={search}
        savedIds={savedIds.data}
        onOpen={openWord}
        onOpenSentence={openSentence}
        onPrefetch={prefetchWord}
        onToggleSave={(wordId) => toggleSave.mutate({ wordId, userWordId: null })}
        onRetry={() => void search.refetch()}
        // Bấm một từ khoá cũ = gõ lại đúng chuỗi đó. Đi qua `setInput` chứ không
        // gọi thẳng API: ô tìm kiếm phải hiện từ khoá vừa chọn, nếu không người
        // dùng thấy kết quả đổi mà không biết mình đang tra gì.
        onPickRecent={setInput}
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
  onOpenSentence,
  onPrefetch,
  onToggleSave,
  onRetry,
  onPickRecent,
}: {
  query: string
  mode: SearchModeChoice
  state: ReturnType<typeof useSearchWords>
  savedIds: Set<number> | undefined
  onOpen: (id: number) => void
  onOpenSentence: (zh: string) => void
  onPrefetch: (id: number) => void
  onToggleSave: (wordId: number) => void
  onRetry: () => void
  onPickRecent: (item: string) => void
}) {
  const recent = useRecentSearches()

  // Ô rỗng → lịch sử tìm kiếm, không phải màn trắng.
  if (query === '') {
    return <RecentSearches items={recent.items} onClear={recent.clear} onPick={onPickRecent} />
  }

  /*
   * Query bị `enabled: false` chặn thì TanStack Query đứng mãi ở `isPending`.
   * Không nói rõ ở đây thì màn hình hiện khung xương vĩnh viễn — trông y hệt
   * hỏng mạng.
   */
  if (!isSearchableQuery(query)) {
    return (
      <EmptyState
        title="Gõ thêm một chữ nữa nhé"
        description="Một chữ cái thì chưa đủ để tìm. Chữ Hán thì một chữ là tra được ngay."
      />
    )
  }

  if (state.isPending) {
    return (
      <div aria-busy>
        <VocabularyListSkeleton />
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
  const translation = state.data?.translation ?? null

  if (words.length === 0) {
    /*
     * Có câu dịch mà không có mục từ nào là ca THƯỜNG với truy vấn dạng câu:
     * `bệnh viện ở đâu` dịch được nhưng không từ nào trong đó là mục từ điển
     * đáng trả về. Hiện "Không tìm thấy từ nào" ở đây là nói dối — app vừa trả
     * lời được câu hỏi.
     */
    if (translation) {
      return (
        <div className="space-y-3">
          <TranslationCard
            translation={translation}
            onSelect={() => onOpenSentence(translation.zh)}
          />
          <p className="text-caption text-text-secondary px-1">
            Không có mục từ điển nào khớp riêng lẻ với câu này.
          </p>
        </div>
      )
    }

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
    <div
      // `animate-rise`: nội dung tan vào đúng chỗ khung xương vừa đứng, thay vì
      // bị cắt cứng. `duration-ui ease-soft` thay cho `transition-opacity` trần
      // — mặc định của Tailwind là 150ms với đường cong riêng, không qua token.
      className={cn(
        'animate-rise duration-ui ease-soft space-y-3 transition-opacity',
        stale && 'opacity-50',
      )}
      aria-busy={stale}
    >
      {/*
        Câu dịch đứng TRƯỚC danh sách từ. Người gõ cả một câu muốn câu trả lời
        trước, rồi mới tra từng chữ — không phải ngược lại.

        Ngoài `<ul>` chứ không phải một `<li>` đầu tiên: nó không cùng loại với
        các mục còn lại, và nhét một phần tử không-phải-từ vào danh sách từ sẽ
        làm trình đọc màn hình đếm sai số kết quả.
      */}
      {translation && (
        <TranslationCard
          translation={translation}
          onSelect={() => onOpenSentence(translation.zh)}
        />
      )}

      <ul className="space-y-3">
        {words.map((word) => (
          <li key={word.id} onMouseEnter={() => onPrefetch(word.id)}>
            <VocabularyCard
              word={word}
              // Trạng thái đã lưu lấy từ `/vocabulary/ids`, KHÔNG từ response
              // tìm kiếm — response từ điển không mang trường theo user (C2).
              saved={savedIds?.has(word.id) ?? false}
              onSelect={() => onOpen(word.id)}
              onToggleSave={() => onToggleSave(word.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function RecentSearches({
  items,
  onClear,
  onPick,
}: {
  items: string[]
  onClear: () => void
  onPick: (item: string) => void
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Bắt đầu tra từ"
        description="Gõ tiếng Việt, chữ Hán, pinyin, hay âm Hán-Việt — ví dụ con mèo, 学习, xuexi, học tập. 🌸"
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
      {/*
        Chip là `<button>` chứ KHÔNG phải `<span>`.

        Trước đây đây là một `<span>` không có handler: nó mang nền pill, bo tròn
        và màu nhấn — tức trông y hệt một thứ bấm được — mà chạm vào thì không có
        gì xảy ra. Đó đúng là "nút chết" mà chính file này viện ra để cắt nút
        camera và hai tab thừa; lịch sử tìm kiếm mà không tra lại được thì cũng
        không còn lý do tồn tại.

        `min-h-11` = 44px, ngưỡng vùng chạm tối thiểu — `py-2` cũ chỉ cho 38px.
      */}
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item}>
            <button
              type="button"
              onClick={() => onPick(item)}
              className={cn(
                'bg-primary-pale text-body text-text-secondary inline-flex min-h-11 items-center rounded-full px-4',
                'duration-press ease-soft cursor-pointer transition active:scale-[0.97]',
                'hover:bg-primary-soft hover:text-primary',
              )}
            >
              {item}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
