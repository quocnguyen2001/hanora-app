import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import type { WordDetail, WordSense } from '@/types/dictionary'
import { AiSourceNote } from './AiSourceNote'
import { WordSenses } from './WordSenses'

/**
 * Tab "Nghĩa" — mọi cách trả lời câu hỏi "từ này nghĩa là gì".
 *
 * ## Vì sao tab này KHÔNG BAO GIỜ rỗng
 *
 * Đó là ràng buộc, không phải may mắn. Ba nguồn nghĩa xếp theo độ tin cậy giảm
 * dần, và nguồn CUỐI luôn có:
 *
 *   `senses`          — AI, đã nhóm theo từ loại. Vắng khi chưa sinh xong hoặc
 *                       `unavailable`.
 *   `definitions_vi`  — CVDICT. Vắng ở ~7% từ.
 *   `definitions_en`  — CC-CEDICT. KHÔNG BAO GIỜ rỗng; đây là đáy.
 *
 * Vì `definitions_en` là đáy nên tab mặc định luôn có gì đó để đọc — điều kiện
 * để bộ tab cố định đứng vững ở MỌI từ.
 *
 * ## Vì sao nghĩa Anh luôn ở lại (luật R1)
 *
 * Kể cả khi đã có `senses` và `definitions_vi`. Nghĩa Việt của CVDICT dịch bằng
 * AI có người rà và tác giả thừa nhận còn sót lỗi; `senses` thì AI sinh và chưa
 * ai rà. Dòng tiếng Anh là cơ chế đối chiếu DUY NHẤT người học có khi nghi ngờ.
 *
 * `senses` và `definitions_vi` KHÔNG hiện cùng lúc: chúng nói gần như cùng một
 * việc, và `senses` là bản đọc được hơn của cùng thông tin.
 */
export function WordMeaningPanel({
  word,
  senses,
  usageNote,
  enriching,
}: {
  word: WordDetail
  senses: WordSense[]
  usageNote: string | null
  /** Lớp làm giàu còn đang sinh — quyết định hiện khung xương hay không. */
  enriching: boolean
}) {
  const hasSenses = senses.length > 0
  const vietnamese = word.definitions_vi ?? []

  return (
    <div className="space-y-4">
      <Card>
        {hasSenses ? (
          <>
            <h2 className="text-section">Nghĩa theo từ loại</h2>
            <AiSourceNote />
            <WordSenses senses={senses} />
          </>
        ) : (
          <>
            <h2 className="text-section">Nghĩa</h2>

            {vietnamese.length > 0 && (
              <ul className="text-meaning text-text-primary mt-3 space-y-1">
                {vietnamese.map((meaning) => (
                  <li key={meaning}>{meaning}</li>
                ))}
              </ul>
            )}

            {/*
              Khung xương cho lớp làm giàu: MỘT khối duy nhất, và chỉ khi CHƯA có
              nghĩa Việt nào để đọc.

              Từ đã có `definitions_vi` thì người dùng đọc được ngay; treo thêm
              một khung xương bên dưới là hứa một thứ có thể không bao giờ tới
              (`unavailable` là kết cục thường gặp).
            */}
            {enriching && vietnamese.length === 0 && (
              <>
                <Skeleton className="mt-3 h-6 w-full" />
                <Skeleton className="mt-2 h-6 w-4/5" />
              </>
            )}
          </>
        )}

        {/*
          Nghĩa tiếng Anh LUÔN có mặt và không bao giờ bị thay thế (luật R1).

          Vạch ngăn VÀ nhãn nguồn đều KHÔNG phải trang trí, và nhãn là phần bắt
          buộc hơn.

          Vạch: không có nó, "to learn / to study" nối thẳng vào danh sách nghĩa
          Việt ngay trên và đọc ra như mục tiếp theo của cùng một danh sách.

          Nhãn: khối này ở CHUNG thẻ với `senses`, mà `senses` mang
          `AiSourceNote` ("chưa có người rà"). Không nói ra nguồn thì nhãn AI đó
          phủ luôn xuống đây — và người học đang đối chiếu nghĩa Việt với nghĩa
          Anh sẽ thấy CẢ HAI dưới cùng một lời cảnh báo. Đó đúng là phá luật R1
          theo đường vòng: nó không giấu dòng tiếng Anh, nó chỉ làm dòng đó mất
          giá trị đối chiếu.

          Ẩn HẲN khi rỗng: `definitions_en` là mảng, và một response cũ trong
          cache service worker 30 ngày có thể trả về `[]`. Không có nhánh này
          thì kết quả là một vạch kẻ và một nhãn treo trên khoảng trống.
        */}
        {word.definitions_en.length > 0 && (
          <div className="border-border/60 mt-4 border-t pt-3">
            <p className="text-caption text-text-secondary">Định nghĩa tiếng Anh · CC-CEDICT</p>
            <ul className="text-body text-text-secondary mt-1 space-y-1">
              {word.definitions_en.map((definition) => (
                <li key={definition}>{definition}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {usageNote !== null && (
        <Card>
          <h2 className="text-section">Ghi chú dùng từ</h2>
          <AiSourceNote />
          <p className="text-meaning text-text-primary mt-3">{usageNote}</p>
        </Card>
      )}
    </div>
  )
}
