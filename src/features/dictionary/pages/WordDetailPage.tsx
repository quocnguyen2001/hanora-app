import { useNavigate, useParams } from 'react-router'
import { AudioButton } from '@/components/common/AudioButton'
import { WordDetailHero } from '@/components/common/WordDetailHero'
import { CloseIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSavedWordIds, useToggleSaveWord } from '@/features/vocabulary/hooks'
import { useSpeech } from '@/hooks/use-speech'
import { ApiError } from '@/lib/api'
import type { CharacterBreakdown, ExampleSentence } from '@/types/dictionary'
import { useWord } from '../hooks'

export function WordDetailPage() {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const wordId = Number(params.id)

  const { data: word, isPending, isError, error, refetch } = useWord(wordId)
  const savedIds = useSavedWordIds()
  const toggleSave = useToggleSaveWord()
  const speech = useSpeech()

  if (isPending) {
    return (
      <div aria-busy className="space-y-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-48 w-full rounded-hero" />
        <Skeleton className="h-24 w-full" />
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <IconButton
          label="Quay lại"
          icon={<CloseIcon size={20} />}
          onClick={() => void navigate(-1)}
        />
      </div>

      <WordDetailHero
        word={word}
        audioState={speech.state}
        onPlayAudio={() => speech.play(word.simplified)}
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
            {word.characters.map((character) => (
              <CharacterRow
                key={`${character.char}-${character.pinyin}`}
                character={character}
                audioState={speech.state}
                onPlay={() => speech.play(character.char)}
              />
            ))}
          </ul>
        </Card>
      )}

      {/* Section "Ví dụ" ẩn HẲN khi rỗng (D6) — chỉ ~75% từ có câu. */}
      {word.examples.length > 0 && (
        <Card>
          <h2 className="text-section">Ví dụ</h2>
          <ul className="mt-3 space-y-4">
            {word.examples.map((example) => (
              <ExampleRow
                key={example.id}
                example={example}
                audioState={speech.state}
                onPlay={() => speech.play(example.sentence_zh)}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function ExampleRow({
  example,
  audioState,
  onPlay,
}: {
  example: ExampleSentence
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

      {/* KHÔNG có dòng pinyin cho câu (D6). */}
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
