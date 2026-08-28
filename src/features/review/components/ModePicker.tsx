import { Card } from '@/components/ui/Card'
import type { ReviewMode } from '../api'

const MODES = [
  {
    value: 'mcq' as const,
    title: 'Trắc nghiệm',
    description: 'Nhìn chữ Hán, chọn âm Hán-Việt đúng trong 4 lựa chọn.',
  },
  {
    value: 'typing' as const,
    title: 'Gõ lại',
    description: 'Nhìn âm Hán-Việt, viết lại chữ Hán. Chấp nhận cả pinyin.',
  },
]

export function ModePicker({ onPick }: { onPick: (mode: ReviewMode) => void }) {
  return (
    <div className="space-y-3">
      <h1 className="text-title">Ôn tập</h1>
      <p className="text-body text-text-secondary">Chọn cách ôn cho phiên này.</p>

      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          onClick={() => onPick(mode.value)}
          className="w-full text-left"
        >
          <Card className="hover:bg-primary-pale transition-colors duration-150">
            <p className="text-section text-text-primary">{mode.title}</p>
            <p className="text-body text-text-secondary mt-1">{mode.description}</p>
          </Card>
        </button>
      ))}
    </div>
  )
}
