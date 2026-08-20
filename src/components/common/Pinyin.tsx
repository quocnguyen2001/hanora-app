import { cn } from '@/lib/cn'

/** Pinyin — dòng thứ hai trong hierarchy, quiet hơn chữ Hán. */
export function Pinyin({ children, className }: { children: string; className?: string }) {
  return (
    <span lang="zh-Latn-pinyin" className={cn('text-pinyin text-text-secondary', className)}>
      {children}
    </span>
  )
}
