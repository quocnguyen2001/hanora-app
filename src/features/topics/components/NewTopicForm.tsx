import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { ApiError } from '@/lib/api'
import { useCreateTopic } from '../hooks'

/**
 * Vài emoji gợi ý, KHÔNG phải bộ chọn emoji đầy đủ.
 *
 * Một picker thật là một phụ thuộc mới cho thứ chỉ trang trí thẻ chủ đề. Sáu
 * lựa chọn cộng mặc định 📘 phủ hết nhu cầu thực tế, và người dùng vẫn gõ được
 * emoji khác vào ô tên nếu thích.
 */
const EMOJI_CHOICES = ['📘', '🎬', '🎵', '⚽', '🎮', '🌍'] as const

export function NewTopicForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState<string>(EMOJI_CHOICES[0])
  const create = useCreateTopic()

  function submit(event: React.FormEvent): void {
    event.preventDefault()

    // `useMutation` KHÔNG dedupe như `useQuery`; bấm kép trên mạng chậm sẽ bắn
    // hai request và tiêu hai suất trong trần 5/giờ.
    if (create.isPending) return

    create.mutate(
      { name: name.trim(), emoji },
      {
        onSuccess: () => {
          setName('')
          onClose()
        },
      },
    )
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Chủ đề mới">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Bạn muốn học về gì?"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="ví dụ: phim ảnh, âm nhạc, nấu ăn"
          maxLength={40}
          error={errorFor(create.error)}
          hint="Mình sẽ tìm những từ thông dụng nhất của chủ đề này."
          autoFocus
        />

        <fieldset className="space-y-2">
          <legend className="text-caption text-text-secondary">Biểu tượng</legend>
          <div className="flex gap-2">
            {EMOJI_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => setEmoji(choice)}
                aria-pressed={emoji === choice}
                aria-label={`Chọn biểu tượng ${choice}`}
                className={cn(
                  'rounded-control-lg flex h-11 w-11 items-center justify-center text-xl',
                  emoji === choice ? 'bg-primary-soft ring-primary ring-2' : 'bg-surface border-border border',
                )}
              >
                <span aria-hidden>{choice}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/*
          Nói trước là phải CHỜ. Job sinh từ mất 16-25 giây, và một nút bấm xong
          không thấy gì xảy ra ngay là chỗ người dùng bấm lại lần nữa.
        */}
        <p className="text-caption text-text-secondary">
          Chủ đề sẽ sẵn sàng sau khoảng nửa phút. Chỉ mình bạn nhìn thấy nó.
        </p>

        <Button type="submit" className="w-full" disabled={create.isPending || name.trim().length < 2}>
          {create.isPending ? 'Đang tạo…' : 'Tạo chủ đề'}
        </Button>
      </form>
    </BottomSheet>
  )
}

/** Lỗi 422 của API đã là câu tiếng Việt đọc được — hiện thẳng nó. */
function errorFor(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined

  if (error.isNetworkError) return 'Đang ngoại tuyến — tạo chủ đề cần kết nối.'

  return error.errors.name?.[0] ?? error.message
}
