import { useNavigate, useParams } from 'react-router'
import { AudioButton } from '@/components/common/AudioButton'
import { WordDetailHero } from '@/components/common/WordDetailHero'
import { CloseIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { WordDetailSkeleton } from '@/components/ui/PageSkeleton'
import { Skeleton } from '@/components/ui/Skeleton'
import { WordReviewHistory } from '@/features/review/components/WordReviewHistory'
import { useSavedWordIds, useToggleSaveWord } from '@/features/vocabulary/hooks'
import { useSpeech } from '@/hooks/use-speech'
import { ApiError } from '@/lib/api'
import type { CharacterBreakdown, ExampleSentence } from '@/types/dictionary'
import { useExampleTranslations, useWord } from '../hooks'

export function WordDetailPage() {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
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
  const toggleSave = useToggleSaveWord()
  const speech = useSpeech()

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

  const hasAnyTranslation = translationById.size > 0

  return (
    // `animate-rise`: nhánh này mount mới khi `isPending` lật, nên nội dung tan
    // vào đúng chỗ khung xương vừa đứng thay vì bị cắt cứng.
    <div className="animate-rise space-y-4">
      <div className="flex items-center justify-between">
        <IconButton
          label="Quay lại"
          icon={<CloseIcon size={20} />}
          onClick={() => void navigate(-1)}
        />
      </div>

      <WordDetailHero
        word={word}
        audioState={speech.stateFor('word')}
        onPlayAudio={() => speech.play(word.simplified, 'word')}
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

      {word.characters.length > 0 && (
        <Card>
          <h2 className="text-section">Hán tự</h2>
          <ul className="mt-3 space-y-3">
            {word.characters.map((character, index) => (
              <CharacterRow
                key={`${character.char}-${character.pinyin}`}
                character={character}
                /* Khoá theo VỊ TRÍ: từ láy (谢谢) có hai Hán tự giống hệt nhau,
                   khoá theo chữ sẽ làm cả hai nút cùng sáng. */
                audioState={speech.stateFor(`char:${index}`)}
                onPlay={() => speech.play(character.char, `char:${index}`)}
              />
            ))}
          </ul>
        </Card>
      )}

      {/* Section "Ví dụ" ẩn HẲN khi rỗng (D6) — chỉ ~75% từ có câu. */}
      {word.examples.length > 0 && (
        <Card>
          <h2 className="text-section">Ví dụ</h2>

          {/*
            Nhãn nguồn — nghĩa vụ gắn nhãn nội dung AI của dự án, cùng quy ước mà
            thẻ dịch ở màn Tìm kiếm đang giữ.

            MỘT lần cho cả khối, không phải mỗi câu: ba nhãn giống hệt nhau trong
            một thẻ là nhiễu, và người đọc bỏ qua cả ba.
          */}
          {hasAnyTranslation && (
            <p className="text-caption text-text-secondary mt-1">
              Nghĩa tiếng Việt do AI dịch từ bản tiếng Anh.
            </p>
          )}

          <ul className="mt-3 space-y-4" aria-busy={translating}>
            {word.examples.map((example) => (
              <ExampleRow
                key={example.id}
                example={example}
                // Ghép theo id, KHÔNG theo thứ tự mảng: hai truy vấn khác nhau
                // không có gì bảo đảm trả về cùng một thứ tự.
                translation={translationById.get(example.id) ?? null}
                translating={translating}
                audioState={speech.stateFor(`example:${example.id}`)}
                onPlay={() => speech.play(example.sentence_zh, `example:${example.id}`)}
              />
            ))}
          </ul>
        </Card>
      )}

      {/* Chỉ hiện với từ ĐÃ LƯU: từ chưa lưu không có lịch sử ôn để nói, và
          component tự bỏ qua lời gọi API trong trường hợp đó. */}
      <WordReviewHistory wordId={word.id} saved={saved} />
    </div>
  )
}

function ExampleRow({
  example,
  translation,
  translating,
  audioState,
  onPlay,
}: {
  example: ExampleSentence
  translation: string | null
  translating: boolean
  audioState: ReturnType<typeof useSpeech>['state']
  onPlay: () => void
}) {
  return (
    <li className="space-y-1">
      <div className="flex items-start gap-2">
        <p lang="zh-Hans" className="font-hanzi text-meaning text-text-primary flex-1">
          {example.sentence_zh}
        </p>
        <AudioButton state={audioState} onPlay={onPlay} size="sm" />
      </div>

      {/*
        Nghĩa tiếng Việt đứng TRÊN dòng tiếng Anh và ở bậc chữ cao hơn: đây là
        dòng người học đọc trước.

        Không có bản dịch thì ẩn HẲN, không hiện khung trống — cùng quy ước mà
        `han_viet: null` và `examples: []` đang giữ.
      */}
      {translation !== null && <p className="text-meaning text-text-primary">{translation}</p>}

      {/*
        `h-6` khớp hộp dòng của `text-meaning` (24px), nên bản dịch tới nơi thay
        vào đúng chỗ khung xương đang đứng thay vì đẩy phần còn lại của thẻ xuống.

        Skeleton chứ không phải spinner hay chữ "đang dịch", theo `ux-rules.md`:
        spinner nói "đang chờ", skeleton nói "sắp có gì ở đây".
      */}
      {translation === null && translating && <Skeleton className="h-6 w-4/5" />}

      {/*
        Dòng tiếng Anh Ở LẠI, nhỏ và nhạt hơn dòng Việt.

        Bản Việt do máy dịch và không có người rà, nên đây là cơ chế đối chiếu duy
        nhất người học có — cùng lý do `definitions_vi` không bao giờ thay thế
        `definitions_en`.

        KHÔNG có dòng pinyin cho câu (D6).
      */}
      <p className="text-body text-text-secondary">{example.translation_en}</p>

      {/*
        Ghi công tác giả — nghĩa vụ CC BY của Tatoeba, không phải chi tiết trang
        trí. Nhỏ và quiet, nhưng phải có mặt.
      */}
      {example.contributor && (
        <p className="text-caption text-text-secondary">
          Tatoeba · {example.contributor} · {example.license}
        </p>
      )}
    </li>
  )
}

function CharacterRow({
  character,
  audioState,
  onPlay,
}: {
  character: CharacterBreakdown
  audioState: ReturnType<typeof useSpeech>['state']
  onPlay: () => void
}) {
  return (
    <li className="flex items-center gap-3">
      <span lang="zh-Hans" className="font-hanzi text-[1.75rem] leading-9">
        {character.char}
      </span>
      <span className="flex-1">
        {/*
          Âm đọc ĐÚNG NGỮ CẢNH của từ, do P6 chọn theo âm tiết pinyin — 银行 cho
          `行 háng`, không phải `xíng`.
        */}
        <span className="text-body text-text-secondary">{character.pinyin}</span>
        {character.han_viet && (
          <span className="text-body text-text-primary ml-2">{character.han_viet}</span>
        )}
      </span>
      <AudioButton state={audioState} onPlay={onPlay} size="sm" />
    </li>
  )
}
