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
 * chữ Hán → pinyin → âm Hán-Việt → nghĩa tiếng Việt → định nghĩa tiếng Anh.
 *
 * Nghĩa tiếng Việt đứng TRƯỚC vì đó là thứ người học Việt đọc trước. Nó KHÔNG
 * thay thế định nghĩa tiếng Anh: nghĩa Việt dịch bằng AI có người rà và còn sót
 * lỗi, nên dòng tiếng Anh là cơ chế đối chiếu duy nhất người dùng có. Với từ
 * khẩu ngữ như `东西` thì `đông tây` cũng chỉ là âm đọc chứ không phải nghĩa —
 * cùng một lý do, hai tầng khác nhau.
 *
 * `definitions_vi === null` (~7% từ) thì phần nghĩa Việt ẩn HẲN, không hiện
 * khung trống — cùng quy ước mà `han_viet` dùng.
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

  /*
   * Thẻ chỉ lấy nghĩa Việt ĐẦU TIÊN, không phải hai như bên tiếng Anh.
   *
   * Thẻ đã có ba dòng trước khi tới đây, và CVDICT thừa hưởng ghi chú lượng từ
   * của CC-CEDICT làm nghĩa riêng — 狗 là `["chó", "LT:隻|只[zhi1],條|条[tiao2]"]`.
   * Lấy hai nghĩa thì dòng đầu tiên người học Việt đọc được là
   * "chó; LT:隻|只[zhi1]". Nghĩa chính luôn đứng đầu, nên một nghĩa là đủ ở đây;
   * trang chi tiết hiện đủ.
   */
  const meaningVi = word.definitions_vi?.[0]

  return (
    <div
      className={cn(
        'bg-surface shadow-card flex items-center gap-4',
        'transition duration-press ease-soft',
        'rounded-card p-4',
        variant === 'featured' && 'rounded-card-lg p-5',
        // `:active` khớp cả với tổ tiên của phần tử đang bị nhấn, nên chạm vào
        // nút bên trong vẫn làm cả thẻ lún — đúng ý: cả thẻ là một vùng chạm.
        onSelect && 'hover:bg-primary-pale active:bg-primary-soft cursor-pointer active:scale-[0.99]',
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

        {meaningVi && <span className="text-body text-text-primary line-clamp-2">{meaningVi}</span>}

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
          // Đánh dấu là hành động có sức nặng cảm xúc nhất trong app — nó là
          // lúc người dùng quyết định "từ này tôi muốn nhớ". Nhích to một chút
          // khi đã lưu, đủ để thấy chứ không nảy.
          icon={
            <BookmarkIcon
              size={22}
              filled={saved}
              className={cn(
                'transition-transform duration-ui ease-soft',
                saved ? 'scale-110' : 'scale-100',
              )}
            />
          }
          variant={saved ? 'soft' : 'ghost'}
          onClick={onToggleSave}
          disabled={loading}
          aria-pressed={saved}
        />
      )}
    </div>
  )
}
