import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { CloseIcon } from '@/components/icons'
import { IconButton } from './IconButton'

/**
 * Overlay duy nhất của MVP.
 *
 * KHÔNG dựng `Modal`. Mọi luồng trong MVP là mobile-first và dùng bottom sheet;
 * thêm một overlay primitive thứ hai chưa màn nào cần là thừa, và hai primitive
 * chồng nhau là hai bộ bug focus trap phải bảo trì.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      /*
       * FOCUS TRAP.
       *
       * Không giữ focus lại thì Tab sẽ đi ra nội dung phía sau sheet — nội dung
       * đó đang bị che và người dùng bàn phím sẽ lạc vào một vùng họ không nhìn
       * thấy, không có cách nào quay ra.
       */
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      )

      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Khóa cuộn nền: cuộn trang phía sau khi sheet đang mở là lỗi kinh điển
    // trên iOS.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      // Trả focus về nơi người dùng đứng trước khi mở.
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="bg-text-primary/25 absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="bg-surface rounded-t-hero relative w-full max-w-lg pb-[env(safe-area-inset-bottom)] outline-none"
            initial={{ y: reduceMotion ? 0 : '100%' }}
            animate={{ y: 0 }}
            exit={{ y: reduceMotion ? 0 : '100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          >
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-section text-text-primary">{title}</h2>
              <IconButton label="Đóng" icon={<CloseIcon size={20} />} onClick={onClose} />
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
