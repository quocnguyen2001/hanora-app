import { Badge } from '@/components/ui/Badge'
import type { WordSense } from '@/types/dictionary'

/**
 * Nghĩa nhóm theo từ loại.
 *
 * Nhóm ở đây chứ không ở API: model trả một danh sách phẳng và có thể lặp lại
 * cùng một `pos` ở hai mục rời nhau. Gom lại là việc trình bày, và làm ở FE thì
 * response giữ nguyên thứ tự model chọn — thứ tự đó mang thông tin (nghĩa phổ
 * biến trước).
 *
 * `Map` chứ không phải object: nó giữ THỨ TỰ CHÈN, nên nhóm nào có nghĩa xuất
 * hiện sớm nhất thì đứng trước. Object với khoá chuỗi cũng giữ thứ tự chèn ở
 * mọi engine hiện đại, nhưng `Map` nói rõ ý định đó thay vì dựa vào nó.
 */
export function WordSenses({ senses }: { senses: WordSense[] }) {
  const groups = new Map<string, WordSense[]>()

  for (const sense of senses) {
    const existing = groups.get(sense.pos)

    if (existing === undefined) {
      groups.set(sense.pos, [sense])
    } else {
      existing.push(sense)
    }
  }

  return (
    <ul className="mt-3 space-y-4">
      {[...groups].map(([pos, items]) => (
        <li key={pos}>
          <Badge tone="primary">{pos}</Badge>

          {/*
            `list-decimal` chứ không dấu chấm đầu dòng: nhiều nghĩa trong cùng
            một từ loại là thứ người học cần đếm và nhắc lại được ("nghĩa thứ
            hai"), khác hẳn một danh sách từ ghép vốn không có thứ tự nào.
          */}
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            {items.map((sense) => (
              <li key={sense.vi}>
                <p className="text-meaning text-text-primary">{sense.vi}</p>

                {/* Ghi chú của RIÊNG nghĩa này — nhạt hơn, đứng dưới. */}
                {sense.note !== null && (
                  <p className="text-body text-text-secondary mt-0.5">{sense.note}</p>
                )}
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  )
}
