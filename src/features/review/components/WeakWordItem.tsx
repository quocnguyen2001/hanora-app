import { HanViet } from '@/components/common/HanViet'
import { HanziText } from '@/components/common/HanziText'
import { Badge } from '@/components/ui/Badge'
import type { WeakWord } from '../history-api'

/** Một dòng trong danh sách "Từ hay sai". */
export function WeakWordItem({ item, onSelect }: { item: WeakWord; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="hover:bg-primary-pale rounded-control flex w-full items-center gap-3 px-1 py-2 text-left transition-colors duration-150"
    >
      <HanziText size="inline">{item.word.simplified}</HanziText>

      <div className="min-w-0 flex-1">
        {item.word.han_viet && <HanViet>{item.word.han_viet}</HanViet>}
        <p className="text-caption text-text-secondary">Tỉ lệ đúng {item.accuracy}%</p>
      </div>

      <Badge>sai {item.wrong_count} lần</Badge>
    </button>
  )
}
