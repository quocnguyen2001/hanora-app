import { cn } from '@/lib/cn'
import { HanziText } from './HanziText'

/**
 * Chữ Hán cỡ hero đặt trên một tấm nền riêng.
 *
 * ## Vì sao chữ Hán cần một tấm nền, còn pinyin thì không
 *
 * Trên màn chi tiết từ và màn trắc nghiệm, chữ Hán là thứ người học phải nhìn
 * lâu nhất và nhớ mặt. Nhưng nó lại đứng giữa một thẻ trắng cùng với pinyin, âm
 * Hán-Việt, badge, ảnh minh hoạ và hai danh sách nghĩa — tức là một dòng chữ to
 * trong một cột nhiều dòng chữ. To hơn không đủ để tách nó ra khỏi nhóm đó; nó
 * cần một mặt phẳng riêng để đứng lên.
 *
 * Đây cũng là chỗ font thư pháp trả công: nét bút cần khoảng thở quanh nó mới
 * đọc ra được, và tấm nền chính là khoảng thở đó được vẽ thành hình.
 *
 * ## Vì sao là hình vuông bo góc chứ không phải hình tròn
 *
 * Chữ Hán được viết trong ô vuông — vở tập viết, giấy kẻ ô, con dấu đều vuông.
 * Nền tròn cắt vào bốn góc của những chữ nhiều nét như `齉` hoặc `爨`, và với từ
 * hai chữ thì nó buộc phải phình thành hình bầu dục.
 *
 * ## Ranh giới
 *
 * KHÔNG thêm hoa văn, khung triện hay vân giấy. `brand.md` nói thẳng: không
 * dùng "overly complex Chinese ornaments". Tấm nền này chỉ có một màu và một
 * đường viền, và toàn bộ phần "ra chất" nằm ở chính nét chữ.
 */
export function HanziPlate({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        'border-border bg-primary-pale rounded-card-lg border px-8 py-4',
        // Chữ Hán dài (thành ngữ bốn chữ) không được tràn ra khỏi tấm nền trên
        // máy 360px — nó xuống dòng bên trong, và tấm nền cao lên theo.
        'max-w-full text-center break-words',
        className,
      )}
    >
      <HanziText size="hero">{children}</HanziText>
    </div>
  )
}
