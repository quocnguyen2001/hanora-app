import { Badge } from '@/components/ui/Badge'
import type { WordSummary } from '@/types/dictionary'
import { AudioButton, type AudioState } from './AudioButton'
import { HanViet } from './HanViet'
import { HanziText } from './HanziText'
import { IllustrationPlaceholder } from './IllustrationPlaceholder'
import { Pinyin } from './Pinyin'

/**
 * Khối đầu màn chi tiết từ.
 *
 * THỨ TỰ CỨNG, không phải gợi ý:
 *   chữ Hán → pinyin → âm Hán-Việt → tags → illustration → định nghĩa
 *
 * Đây là hierarchy mà cả design system lẫn Success Criteria của P6/P8 đều đòi.
 * Đổi thứ tự là đổi thứ người học nhìn thấy trước, tức đổi thứ họ nhớ.
 */
export function WordDetailHero({
  word,
  audioState = 'idle',
  onPlayAudio,
  actions,
}: {
  word: WordSummary
  audioState?: AudioState
  onPlayAudio?: () => void
  actions?: React.ReactNode
}) {
  return (
    <section className="bg-surface shadow-card flex flex-col items-center gap-3 rounded-hero p-6 text-center">
      <HanziText size="hero">{word.simplified}</HanziText>

      {word.traditional !== word.simplified && (
        <span className="text-caption text-text-secondary">
          Phồn thể: <HanziText size="inline">{word.traditional}</HanziText>
        </span>
      )}

      <div className="flex items-center gap-2">
        <Pinyin>{word.pinyin}</Pinyin>
        <AudioButton state={audioState} onPlay={onPlayAudio} />
      </div>

      <HanViet>{word.han_viet}</HanViet>

      {word.hsk_level !== null && <Badge tone="primary">HSK {word.hsk_level}</Badge>}

      <IllustrationPlaceholder className="mt-2 w-32" />

      {/*
        Định nghĩa tiếng Anh LUÔN có mặt, ngay dưới âm Hán-Việt và không bao giờ
        bị nó thay thế (R1). `东西` đọc `đông tây` nhưng nghĩa là "thứ, đồ vật" —
        bỏ dòng tiếng Anh đi là dạy sai.
      */}
      <ul className="text-meaning text-text-primary mt-1 space-y-1">
        {word.definitions_en.map((definition) => (
          <li key={definition}>{definition}</li>
        ))}
      </ul>

      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </section>
  )
}
