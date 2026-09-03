import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import type { useSpeech } from '@/hooks/use-speech'
import type { CharacterBreakdown } from '@/types/dictionary'
import { CharacterCard } from './CharacterCard'

/**
 * Tab "Hán tự" — mổ vào bên trong từ.
 *
 * Trên desktop, từ có từ HAI chữ trở lên xếp thành LƯỚI hai cột. Đây là phần
 * đóng góp chính của tab này vào việc tăng mật độ: mỗi `CharacterCard` cao
 * ~200px, nên một từ bốn chữ xếp dọc là gần 800px cuộn cho thứ mà mắt hoàn
 * toàn quét ngang được.
 *
 * `md` chứ không `lg`, và đây là một xấp xỉ có ý thức: `md` là truy vấn theo bề
 * ngang CỬA SỔ, không phải theo bề ngang panel — CSS container query mới làm
 * được điều đó. Xấp xỉ này đúng vì hai mốc đều rộng rãi: 768–1023px panel chiếm
 * gần hết bề ngang (~736px), còn từ 1024px nó là cột phải của lưới (~616px).
 * Hai cột chữ vừa thoải mái ở cả hai.
 */
export function WordCharacterPanel({
  characters,
  speech,
}: {
  characters: CharacterBreakdown[]
  speech: ReturnType<typeof useSpeech>
}) {
  /*
   * Rỗng là ca THẬT, không phải phòng xa: response `/words/{id}` sống 30 ngày
   * trong service worker, nên người dùng đã mở từ này trước khi API trả
   * `characters` sẽ nhận lại bản không có trường đó.
   *
   * Bộ tab cố định nghĩa là tab vẫn phải ở đây và phải NÓI RA vì sao trống —
   * ẩn tab đi sẽ làm thanh tab đổi hình theo từng từ, đúng thứ thiết kế này
   * sinh ra để chữa.
   */
  if (characters.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Chưa có phân tích Hán tự"
          description="Mở lại từ này sau khi có mạng để tải phần phân tích chữ."
        />
      </Card>
    )
  }

  return (
    <Card>
      <h2 className="sr-only">Hán tự</h2>

      {/*
        `<ul>` một cột trên mobile, hai cột từ `md`.

        `gap-y` PHẢI có, không thừa: `md:space-y-0` gỡ khoảng cách dọc, còn
        `gap-x` chỉ đặt `column-gap`. Thiếu nó thì `row-gap` là 0 — và lỗi chỉ
        lộ ra ở từ từ BA chữ trở lên (图书馆, 对不起), nơi lưới có hàng thứ hai và
        nút "Tập viết" của hàng trên chạm thẳng vào ô chữ của hàng dưới. Từ hai
        chữ không bao giờ bày ra được lỗi này.
      */}
      <ul className="space-y-4 md:grid md:grid-cols-2 md:space-y-0 md:gap-x-6 md:gap-y-6">
        {characters.map((character, index) => (
          <CharacterCard
            key={`${character.char}-${index}`}
            character={character}
            /* Khoá theo VỊ TRÍ: từ láy (谢谢) có hai Hán tự giống hệt nhau,
               khoá theo chữ sẽ làm cả hai nút cùng sáng. */
            audioState={speech.stateFor(`char:${index}`)}
            onPlay={() => speech.play(character.char, `char:${index}`)}
          />
        ))}
      </ul>
    </Card>
  )
}
