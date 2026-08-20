import { BookmarkIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import type { WordSummary } from '@/types/dictionary'
import { HanViet } from './HanViet'
import { HanziText } from './HanziText'
import { Pinyin } from './Pinyin'

export type VocabularyCardVariant = 'compact' | 'default' | 'featured'

/**
 * Component xuất hiện nhiều nhất trong app — mọi kết quả tìm kiếm và mọi mục
 * trong kho từ đều là nó.
 *
 * Thứ tự hiển thị là ràng buộc thiết kế, không phải lựa chọn:
 * chữ Hán → pinyin → âm Hán-Việt → định nghĩa tiếng Anh.
 *
 * Định nghĩa tiếng Anh LUÔN hiện cạnh âm Hán-Việt, không bao giờ bị thay thế
 * (R1): với từ khẩu ngữ như `东西` thì `đông tây` là âm đọc chứ không phải nghĩa.
 */
export function VocabularyCard({
  word,
  variant = 'default',
  saved = false,
  loading = false,
  onSelect,
  onToggleSave,
}: {
  word: WordSummary
  variant?: VocabularyCardVariant
  saved?: boolean
  loading?: boolean
  onSelect?: () => void
  onToggleSave?: () => void
}) {
  const definition = word.definitions_en.slice(0, 2).join('; ')

  return (
    <div
      className={cn(
        'border-border bg-surface flex items-center gap-4 border transition-colors duration-150',
        'rounded-[--radius-card] p-4',
        variant === 'featured' && 'rounded-[--radius-card-lg] p-5',
        onSelect && 'hover:bg-primary-pale active:bg-primary-soft cursor-pointer',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        // Cả vùng nội dung là một nút: chạm vào đâu trong thẻ cũng mở được từ,
        // thay vì phải trúng đúng dòng chữ Hán.
        className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left disabled:cursor-default"
      >
        <span className="flex items-baseline gap-2">
          <HanziText size={variant === 'compact' ? 'inline' : 'title'}>{word.simplified}</HanziText>
          <Pinyin className={variant === 'compact' ? 'text-body' : undefined}>{word.pinyin}</Pinyin>
        </span>

        <HanViet className="text-body">{word.han_viet}</HanViet>

        {variant !== 'compact' && definition && (
          <span className="text-body text-text-secondary line-clamp-2">{definition}</span>
        )}

        {word.hsk_level !== null && variant !== 'compact' && (
          <Badge tone="primary" className="mt-1">
            HSK {word.hsk_level}
          </Badge>
        )}
      </button>

      {onToggleSave && (
        <IconButton
          // Nhãn nói HÀNH ĐỘNG sẽ xảy ra, không phải trạng thái hiện tại.
          label={saved ? `Bỏ lưu ${word.simplified}` : `Lưu ${word.simplified}`}
          icon={<BookmarkIcon size={22} filled={saved} />}
          variant={saved ? 'soft' : 'ghost'}
          onClick={onToggleSave}
          disabled={loading}
          aria-pressed={saved}
        />
      )}
    </div>
  )
}
