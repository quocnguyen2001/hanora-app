import { HanziText } from '@/components/common/HanziText'
import type { CharacterBreakdown } from '@/types/dictionary'

/**
 * Ánh xạ lục thư sang tiếng Việt.
 *
 * Nguồn (Make Me a Hanzi) chỉ phân biệt BA loại, không phải sáu — hội ý, chuyển
 * chú và giả tá không có trong dữ liệu. Nhãn vẫn để "Lục thư" vì ba loại này
 * nằm trong lục thư, nhưng không được suy ba loại còn lại.
 *
 * Một chỗ duy nhất, không rải rác: giá trị nào không có trong bảng thì ẩn dòng,
 * KHÔNG hiện chuỗi tiếng Anh thô. Một dòng "Lục thư: loangraph" tệ hơn hẳn
 * không có dòng nào.
 */
const ETYMOLOGY_LABELS: Record<string, string> = {
  pictophonetic: 'hình thanh',
  ideographic: 'chỉ sự',
  pictographic: 'tượng hình',
}

/**
 * Sáu thuộc tính của một Hán tự.
 *
 * MỖI DÒNG TỰ ẨN khi thiếu dữ liệu. Không nhãn trống, không "chưa có" — cùng
 * quy ước mà `han_viet: null` và `examples: []` đang giữ.
 *
 * Đây không phải ca hiếm: chỉ 71% chữ có nét bút và 82% có âm bộ thủ, còn
 * response cũ trong cache service worker thì không có trường nào cả.
 */
export function CharacterAttributes({ character }: { character: CharacterBreakdown }) {
  const etymology =
    character.etymology_type === null ? null : (ETYMOLOGY_LABELS[character.etymology_type] ?? null)

  return (
    <dl className="space-y-1 text-left">
      <Row label="Bính âm">
        <span className="text-text-secondary">{character.pinyin}</span>
        {character.han_viet !== null && (
          <span className="text-text-primary ml-2">{character.han_viet}</span>
        )}
      </Row>

      {character.decomposition !== null && (
        <Row label="Hình thái">
          {/* Chuỗi IDS gồm ký tự mô tả (⿰ ⿱) xen với chữ Hán, nên nó cần font
              Hán chứ không font giao diện. */}
          <HanziText size="inline">{character.decomposition}</HanziText>
        </Row>
      )}

      {etymology !== null && <Row label="Lục thư">{etymology}</Row>}

      {/*
        Bộ và số nét CHUNG một dòng, như ảnh demo. Cả hai đều ngắn, và tách ra
        làm thẻ cao thêm vô ích trên máy 360px.

        Nhưng chúng vẫn là hai dòng `<dt>/<dd>` độc lập về mặt ngữ nghĩa, nên
        khi chỉ có một trong hai thì dòng đó chỉ hiện phần có.
      */}
      {(character.radical !== null || character.stroke_count !== null) && (
        <div className="flex flex-wrap gap-x-4">
          {character.radical !== null && (
            <Row label="Bộ">
              {character.radical_han_viet !== null && (
                <span className="text-text-primary mr-1 uppercase">
                  {character.radical_han_viet}
                </span>
              )}
              <HanziText size="inline">{character.radical}</HanziText>
            </Row>
          )}

          {character.stroke_count !== null && (
            <Row label="Số nét">
              <span className="text-text-primary">{character.stroke_count}</span>
            </Row>
          )}
        </div>
      )}

      {character.stroke_names !== null && (
        <Row label="Nét bút">
          {/*
            Nét bút là ký tự CJK Strokes (㇀ ㇏) xen với nét cơ bản (一 丨 丿), nên
            cũng cần font Hán. `tracking-wide` để mắt tách được từng nét thay vì
            đọc ra một khối liền.
          */}
          <HanziText size="inline" className="tracking-wide">
            {character.stroke_names.join(' ')}
          </HanziText>
        </Row>
      )}
    </dl>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-body flex flex-wrap items-baseline gap-x-1.5">
      <dt className="text-text-secondary shrink-0">{label}:</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}
