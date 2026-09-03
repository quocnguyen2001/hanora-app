import { useNavigate, useParams, useSearchParams } from 'react-router'
import { WordDetailHero } from '@/components/common/WordDetailHero'
import { ChevronLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { WordDetailSkeleton } from '@/components/ui/PageSkeleton'
import { TabView, type TabViewItem } from '@/components/ui/TabView'
import { WordReviewHistory } from '@/features/review/components/WordReviewHistory'
import { useSavedWordIds, useToggleSaveWord } from '@/features/vocabulary/hooks'
import { useSpeech } from '@/hooks/use-speech'
import { ApiError } from '@/lib/api'
import { stop as stopSpeech } from '@/lib/audio'
import { WordCharacterPanel } from '../components/WordCharacterPanel'
import { WordExamplePanel } from '../components/WordExamplePanel'
import { WordMeaningPanel } from '../components/WordMeaningPanel'
import { useExampleTranslations, useWord, useWordEnrichment } from '../hooks'

/**
 * Giá trị của tham số `?tab=`.
 *
 * Nằm trong URL chứ không phải `useState`, và đó là ràng buộc thật chứ không
 * phải chi tiết đẹp: tab "Ví dụ" chứa danh sách từ ghép bấm được, mỗi mục dẫn
 * sang một trang chi tiết khác. Giữ tab trong state thì bấm Back sẽ trả người
 * dùng về tab đầu tiên của trang cũ — họ mất đúng chỗ vừa đứng.
 */
const TABS = ['nghia', 'hantu', 'vidu'] as const
type TabValue = (typeof TABS)[number]

const DEFAULT_TAB: TabValue = 'nghia'

function parseTab(raw: string | null): TabValue {
  return TABS.includes(raw as TabValue) ? (raw as TabValue) : DEFAULT_TAB
}

/**
 * Màn chi tiết từ.
 *
 * ## Bố cục: hero NGOÀI tab, nội dung TRONG tab
 *
 * Trước đây trang là một cột phẳng gồm hero cộng TỐI ĐA TÁM `Card` anh em, mọi
 * thẻ cùng một trọng số thị giác. Nó có hai tật, và tật thứ hai nặng hơn:
 *
 *   1. Không có thứ bậc — tám hộp giống hệt nhau đọc ra là tám thứ rời rạc.
 *   2. Cấu trúc ĐỔI THEO TỪNG TỪ. Câu ví dụ phủ ~75% mục từ, `definitions_vi`
 *      ~93%, lượng từ 1.554/123.646, còn lớp làm giàu thì tải lười và có thể
 *      `unavailable`. Nên mỗi từ cho ra một hình dạng trang khác nhau, và người
 *      dùng không bao giờ dựng được mô hình "cái gì nằm ở đâu".
 *
 * Ba tab CỐ ĐỊNH chữa tật thứ hai: bộ tab giống hệt nhau ở mọi từ, kể cả từ
 * không có ví dụ (tab đó hiện `EmptyState` nói ra vì sao trống). Học một lần,
 * dùng cho mọi từ.
 *
 * Hero ở NGOÀI tab vì hai thứ trong đó không được phép giấu: chữ Hán — thứ định
 * danh cả trang — và nút "Lưu vào kho", hành động chính của màn.
 *
 * ## Vì sao hai danh sách nghĩa chuyển xuống tab
 *
 * Nếu để nghĩa ở hero thì tab "Nghĩa" chỉ còn `senses` và `usage_note`, cả hai
 * đều là nội dung AI có thể vắng — tức tab MẶC ĐỊNH sẽ trống ở phần lớn từ.
 * Chuyển cả hai xuống giúp tab đầu luôn có nội dung, vì `definitions_en` không
 * bao giờ rỗng.
 *
 * Nó khử reflow ở HERO: hero cũ ẩn nghĩa Việt KHI `senses` về, mà `senses` tải
 * lười — nên phần lớn lần mở, khối nhận diện tự đổi hình một nhịp sau khi người
 * dùng đã bắt đầu đọc. Giờ hero chỉ mang dữ liệu có sẵn từ request đầu, nên nó
 * đứng yên.
 *
 * Cú đổi `definitions_vi` → `senses` thì KHÔNG mất, nó CHUYỂN CHỖ vào panel
 * "Nghĩa". Nói cho đúng: người dùng vẫn thấy danh sách nghĩa Việt bị thay bằng
 * bản nhóm theo từ loại sau 1–3 giây, và giờ nó xảy ra ngay ở vị trí đọc chính.
 *
 * Chấp nhận, vì cách chữa duy nhất là để HAI danh sách nghĩa Việt cạnh nhau —
 * thứ mà `senses` sinh ra để thay, và đã bị từ chối từ khi lớp làm giàu lên.
 * Đừng "sửa" bằng cách đó.
 *
 * ## Desktop: hai cột, hero dính
 *
 * Chữ Hán ở lại trong tầm mắt trong lúc đọc ví dụ ở cột phải.
 *
 * Dính CÓ ĐIỀU KIỆN theo chiều cao khung nhìn, không dính vô điều kiện. Đã đo
 * trên cửa sổ 1100×620 ở cỡ chữ 130%: hero cao 571px, ghim ở `top: 5rem`, nên
 * đáy nó nằm ở 651px — dưới nếp gấp 620px, và nút "Lưu vào kho" ở đúng đáy đó.
 * Nó KHÔNG mất hẳn (sticky nhả ra ở cuối hàng lưới, đo được: cuộn tới đáy trang
 * thì nút hiện lại), nhưng nó khuất suốt gần cả lượt cuộn — với hành động chính
 * của màn thì thế là hỏng.
 *
 * `min-height: 46rem` (736px) là ngưỡng: hero cao nhất đo được 571px cộng
 * `top-20` 80px là 651px, còn dư chỗ. Dưới ngưỡng, hero là phần tử thường và
 * luôn cuộn tới được.
 *
 * KHÔNG chữa bằng `max-height` + `overflow-y`: một vùng cuộn lồng cướp lăn
 * chuột khi con trỏ ở trên nó, và quy tắc cuộn của `responsive.md` cấm.
 */
export function WordDetailPage() {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const wordId = Number(params.id)

  const { data: word, isPending, isError, error, refetch } = useWord(wordId)
  const savedIds = useSavedWordIds()
  /*
   * Gọi SAU khi `word` đã có, và chỉ khi từ này thật sự có câu ví dụ. `useWord`
   * còn `isPending` thì `word` là `undefined` và hook tự đứng im.
   */
  const translations = useExampleTranslations(wordId, {
    enabled: (word?.examples.length ?? 0) > 0,
  })
  /*
   * Lớp làm giàu. Gọi vô điều kiện, khác `useExampleTranslations`: ở đó
   * `enabled` phụ thuộc số câu ví dụ vì ~15% từ chắc chắn không có câu nào, còn
   * ở đây không có tín hiệu nào biết trước từ này có bản làm giàu hay không.
   *
   * CẢ HAI hook gọi ở cấp trang chứ không trong panel, và đó là điều kiện để
   * `TabView` được phép unmount panel không hoạt động: dữ liệu không phụ thuộc
   * tab nào đang mở, nên đổi tab không sinh request nào.
   */
  const enrichmentQuery = useWordEnrichment(wordId)
  const toggleSave = useToggleSaveWord()
  const speech = useSpeech()

  const tab = parseTab(searchParams.get('tab'))

  function selectTab(next: string) {
    /*
     * Dừng phát âm trước khi đổi tab.
     *
     * `useSpeech` sống ở cấp TRANG còn `AudioButton` sống trong panel, nên đổi
     * tab gỡ cái nút mà không dừng cái tiếng: người dùng bấm nghe một câu ví dụ,
     * chuyển sang "Nghĩa", và một câu tiếng Trung vẫn đang được đọc mà trên màn
     * không còn gì phát ra nó — cũng không còn nút nào để tắt.
     *
     * Gọi thẳng `stop()` của tầng audio là đủ: nó huỷ lượt đọc, `onEnd` bắn ra,
     * và bộ đếm lượt trong `useSpeech` tự xoá `playingKey`.
     */
    stopSpeech()

    const params = new URLSearchParams(searchParams)

    params.set('tab', next)
    /*
     * `replace: true` — đổi tab KHÔNG đẩy thêm bản ghi vào lịch sử. Nếu đẩy,
     * người dùng xem cả ba tab rồi bấm Back sẽ phải bấm ba lần mới rời được
     * trang, và nút Back của trình duyệt thành nút "tab trước".
     */
    setSearchParams(params, { replace: true })
  }

  if (isPending) {
    return (
      <div aria-busy>
        {/* Cùng định nghĩa mà `AppShell` dùng làm fallback lúc tải chunk, nên
            khung xương không đổi hình ở ranh giới giữa hai giai đoạn. */}
        <WordDetailSkeleton />
      </div>
    )
  }

  if (isError) {
    const offline = error instanceof ApiError && error.isNetworkError

    return (
      <EmptyState
        title={offline ? 'Đang ngoại tuyến' : 'Không mở được từ này'}
        description={offline ? 'Từ này chưa được lưu ngoại tuyến.' : 'Có lỗi khi tải chi tiết từ.'}
        action={<Button onClick={() => void refetch()}>Thử lại</Button>}
      />
    )
  }

  const saved = savedIds.data?.has(word.id) ?? false

  const translationById = new Map(
    (translations.data?.translations ?? []).map((item) => [item.id, item.translation_vi]),
  )

  /*
   * Còn đang dịch: đây là thứ quyết định câu CHƯA có bản dịch hiện dòng chờ hay
   * không hiện gì. `unavailable` phải rơi vào vế "không hiện gì" — khối ví dụ khi
   * đó trông đúng như trước khi có tính năng này.
   */
  const translating = translations.isPending || translations.data?.status === 'pending'

  const enrichment = enrichmentQuery.data?.enrichment ?? null
  /*
   * Còn đang sinh nội dung. Cùng hình dạng điều kiện mà `translating` dùng, và
   * vì cùng lý do: `unavailable` phải rơi vào vế "không hiện gì", không phải vế
   * "chờ tí nữa có".
   */
  const enriching = enrichmentQuery.isPending || enrichmentQuery.data?.status === 'pending'

  const items: TabViewItem[] = [
    {
      value: 'nghia',
      label: 'Nghĩa',
      panel: (
        <WordMeaningPanel
          word={word}
          senses={enrichment?.senses ?? []}
          usageNote={enrichment?.usage_note ?? null}
          enriching={enriching}
        />
      ),
    },
    {
      value: 'hantu',
      label: 'Hán tự',
      panel: <WordCharacterPanel characters={word.characters} speech={speech} />,
    },
    {
      value: 'vidu',
      label: 'Ví dụ',
      panel: (
        <WordExamplePanel
          examples={word.examples}
          translationById={translationById}
          translating={translating}
          relatedWords={enrichment?.related_words ?? []}
          idioms={enrichment?.idioms ?? []}
          speech={speech}
        />
      ),
    },
  ]

  return (
    // `animate-rise`: nhánh này mount mới khi `isPending` lật, nên nội dung tan
    // vào đúng chỗ khung xương vừa đứng thay vì bị cắt cứng.
    <div className="animate-rise space-y-4">
      {/* `justify-between` cũ bọc đúng MỘT nút nên nó không sắp xếp gì cả — bỏ
          luôn lớp bọc thay vì giữ một flex container một con. */}
      <IconButton
        label="Quay lại"
        icon={<ChevronLeftIcon size={20} />}
        onClick={() => void navigate(-1)}
      />

      {/*
        `<h1>` của màn này. `sr-only` vì thứ bậc THỊ GIÁC đã đúng sẵn — chữ Hán
        trong hero là thứ to nhất trang — nhưng thứ bậc NGỮ NGHĨA thì hụt: trang
        nhảy thẳng từ không có `<h1>` sang `<h2>Nghĩa`, nên người dùng screen
        reader mất mốc "đang ở trang nào".

        Không đưa `<h1>` vào `WordDetailHero`: hero còn được `GalleryPage` dùng,
        mà trang đó đã có `<h1>Gallery</h1>` của riêng nó.
      */}
      <h1 className="sr-only">
        {word.simplified} — {word.pinyin}
      </h1>

      <div className="lg:grid lg:grid-cols-[22rem_1fr] lg:items-start lg:gap-6">
        {/*
          `lg:sticky` cần `lg:items-start` ở lưới cha: mặc định `stretch` kéo ô
          lưới cao bằng cột bên cạnh, và một phần tử dính cao bằng cả cột thì
          không còn chỗ nào để dính.

          `top-20` = chiều cao header desktop (4rem) cộng một nhịp thở.

          Điều kiện `min-height` — xem khối H4 trong docstring của trang.
        */}
        <div className="lg:top-20 lg:[@media(min-height:46rem)]:sticky">
          <WordDetailHero
            word={word}
            audioState={speech.stateFor('word')}
            onPlayAudio={() => speech.play(word.simplified, 'word')}
            /* Hai danh sách nghĩa chuyển xuống tab "Nghĩa" — xem docstring. */
            showDefinitions={false}
            actions={
              <Button
                variant={saved ? 'secondary' : 'primary'}
                loading={toggleSave.isPending}
                onClick={() =>
                  toggleSave.mutate({
                    wordId: word.id,
                    // `null` = chưa lưu → lưu. Khác `null` = đã lưu → bỏ lưu.
                    // Id bản ghi kho lấy ở màn Kho từ; ở đây chỉ cần biết đã lưu chưa.
                    userWordId: saved ? word.id : null,
                  })
                }
              >
                {saved ? 'Đã lưu vào kho' : 'Lưu vào kho'}
              </Button>
            }
          />
        </div>

        <div className="mt-4 space-y-4 lg:mt-0">
          <TabView items={items} value={tab} onChange={selectTab} label="Nội dung từ" />

          {/*
            Lịch sử ôn nằm NGOÀI tab, và đó là phân loại chứ không phải chỗ thừa:
            ba tab nói về TỪ, còn khối này nói về quan hệ giữa BẠN và từ đó. Nó
            cũng chỉ hiện với từ đã lưu, nên nhét vào một tab cố định là tạo ra
            đúng loại tab lúc có lúc không mà thiết kế này tránh.
          */}
          <WordReviewHistory wordId={word.id} saved={saved} />
        </div>
      </div>
    </div>
  )
}
