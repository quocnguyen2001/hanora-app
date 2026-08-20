import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { PencilIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import type { TypingItem } from '../api'

/*
 * Bảng vẽ tải LƯỜI.
 *
 * Nó là tính năng ngoài MVP và phần lớn người dùng sẽ gõ bàn phím. Đưa canvas
 * cùng logic nhận dạng vào bundle chính là bắt mọi người trả phí tải cho một
 * tính năng thiểu số dùng — cùng lý do font CJK không nằm trong precache (P18).
 */
const HandwritingPad = lazy(() =>
  import('./HandwritingPad').then((module) => ({ default: module.HandwritingPad })),
)

/**
 * Mode gõ: hiện ÂM HÁN-VIỆT, người dùng nhập chữ Hán (D13).
 *
 * Bố cục 2 cột từ 768px, xếp chồng dọc ở dưới ngưỡng đó — trên mobile ô nhập
 * phải nằm dưới đề bài để bàn phím ảo không che mất chính câu hỏi.
 */
export function TypingCard({
  item,
  value,
  disabled,
  onChange,
  onSubmit,
}: {
  item: TypingItem
  value: string
  disabled: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [padOpen, setPadOpen] = useState(false)

  useEffect(() => {
    // Cuộn ô nhập vào tầm nhìn khi bàn phím ảo mở. Không làm việc này thì trên
    // máy màn nhỏ ô nhập nằm ngay dưới mép bàn phím và người dùng gõ mù.
    inputRef.current?.focus()
    inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [item.user_word_id])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (value.trim() !== '') onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 md:items-center">
      <Card size="hero" className="text-center">
        <p className="text-caption text-text-secondary">Âm Hán-Việt</p>
        <p lang="vi" className="text-text-primary mt-1 text-2xl font-medium">
          {item.prompt_han_viet}
        </p>
        {/* Gợi ý số ký tự — `_ _` cho từ hai chữ. */}
        <p
          aria-label={`Từ có ${item.hint.char_count} chữ`}
          className="text-pinyin text-text-secondary mt-3 tracking-[0.4em]"
        >
          {'_ '.repeat(item.hint.char_count).trim()}
        </p>
      </Card>

      <div className="space-y-3">
        <Input
          ref={inputRef}
          label="Viết lại từ này"
          // Nhắc rõ chấp nhận cả hai: không phải ai cũng có bộ gõ tiếng Trung.
          placeholder="Nhập chữ Hán hoặc pinyin"
          value={value}
          disabled={disabled}
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          lang="zh-Hans"
          onChange={(event) => onChange(event.target.value)}
        />

        <div className="flex gap-2">
          <Button type="submit" fullWidth size="lg" disabled={disabled || value.trim() === ''}>
            Kiểm tra
          </Button>
          <IconButton
            label={padOpen ? 'Đóng bảng vẽ' : 'Mở bảng vẽ chữ Hán'}
            icon={<PencilIcon size={22} />}
            variant={padOpen ? 'primary' : 'soft'}
            size="md"
            onClick={() => setPadOpen((open) => !open)}
          />
        </div>

        {padOpen && (
          <Suspense fallback={<Skeleton className="h-64 w-full max-w-[260px]" />}>
            <HandwritingPad
              // Nối tiếp vào ô nhập: từ nhiều chữ thì vẽ từng chữ một.
              onPick={(character) => onChange(value + character)}
            />
          </Suspense>
        )}
      </div>
    </form>
  )
}
