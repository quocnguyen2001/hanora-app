import { useState } from 'react'
import { useWordIllustration } from '@/features/dictionary/hooks'
import { cn } from '@/lib/cn'
import { IllustrationPlaceholder } from './IllustrationPlaceholder'

/**
 * Ảnh minh hoạ của một từ.
 *
 * Giữ ĐÚNG khung mà `IllustrationPlaceholder` đang giữ — cùng `aspect-square`,
 * cùng bo góc, cùng chỗ trong hero — nên ba trạng thái (đang tìm / có ảnh /
 * không có ảnh) không làm layout nhảy.
 *
 * **Mọi nhánh đều rơi về placeholder trừ đúng một**: có `url` và ảnh tải được.
 * Đây là tính năng phụ — chỗ trống đã đẹp sẵn và mang đúng giọng thương hiệu,
 * còn ảnh sai thì có hại: người học nhớ `可能` là một loài chim còn tệ hơn hẳn
 * việc không nhìn thấy ảnh nào.
 */
export function WordIllustration({ wordId, className }: { wordId: number; className?: string }) {
  const { data } = useWordIllustration(wordId)
  const illustration = data?.illustration ?? null

  /*
   * URL của tấm ảnh đã tải hỏng.
   *
   * KHÔNG phải phòng xa thừa: app cache URL vĩnh viễn cho một tài nguyên mình
   * không sở hữu. Pixabay gỡ ảnh, hoặc bản `_640` suy ra được lại không tồn
   * tại, thì ô ảnh vỡ ngay giữa hero.
   *
   * Lưu chính URL chứ không phải cờ boolean: so sánh nó với URL hiện tại là đủ
   * để trạng thái tự reset khi đổi từ, không cần effect. Một cờ boolean sẽ ẩn
   * luôn ảnh của từ kế tiếp cho tới khi có ai đó nhớ dọn nó.
   */
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const broken = illustration !== null && brokenUrl === illustration.url

  if (illustration === null || broken) {
    return <IllustrationPlaceholder className={className} />
  }

  return (
    <figure className={cn('flex flex-col items-center gap-1', className)}>
      <img
        src={illustration.url}
        /*
         * `alt=""` + `aria-hidden` có chủ đích: ảnh là minh hoạ trang trí cho
         * một từ mà nghĩa của nó đã hiện đầy đủ bằng chữ ngay bên dưới. Đặt
         * `alt` bằng chữ Hán hay nghĩa Việt sẽ khiến screen reader đọc lặp.
         * Cùng lý do `IllustrationPlaceholder` đang để `aria-hidden`.
         */
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        width={illustration.width ?? undefined}
        height={illustration.height ?? undefined}
        onError={() => setBrokenUrl(illustration.url)}
        // `object-cover`: ảnh Pixabay tỉ lệ tự do (640×426) còn ô là vuông.
        className="rounded-card-lg aspect-square w-full object-cover"
      />

      {/*
        Ghi công — nghĩa vụ theo ToS Pixabay ("show your users where the images
        are from"), không phải chi tiết trang trí. Cùng khuôn với dòng ghi công
        Tatoeba ở `ExampleRow`: nhỏ và quiet, nhưng phải có mặt.
      */}
      <figcaption className="text-caption text-text-secondary">
        <a
          href={illustration.page_url ?? 'https://pixabay.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Pixabay
        </a>
        {illustration.author !== null && ` · ${illustration.author}`}
      </figcaption>
    </figure>
  )
}
