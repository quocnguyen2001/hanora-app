import type { ReactNode } from 'react'
import { Skeleton, VocabularyCardSkeleton } from './Skeleton'

/**
 * Khung xương theo HÌNH DẠNG từng trang.
 *
 * Tách khỏi `Skeleton.tsx` vì hai ranh giới khác nhau: ở đó là primitive (một
 * hình chữ nhật biết thở), ở đây là bố cục của một màn cụ thể.
 *
 * File này BẮT BUỘC nằm trong bundle chính. `AppShell` dùng nó làm fallback cho
 * `Suspense` trong lúc tải chunk của trang lười — nếu lấy khung xương từ chính
 * file trang thì import đó kéo luôn chunk về, và code-split mất sạch tác dụng
 * (bundle chính từng giảm 499 KB → 245 KB nhờ tách, xem `lazy-pages.ts`).
 *
 * Vì vậy mỗi khung xương định nghĩa ĐÚNG MỘT LẦN ở đây rồi dùng ở hai nơi:
 *   1. fallback của `Suspense` — lúc chunk trang chưa về;
 *   2. nhánh `isPending` trong chính trang — lúc chunk đã về, dữ liệu thì chưa.
 *
 * Đó là thứ khiến hai giai đoạn nối liền nhau: khung xương KHÔNG đổi hình khi
 * chunk về, nó đứng yên tại chỗ cho tới lúc dữ liệu thật thay vào.
 *
 * Chiều cao dưới đây bám theo component thật, sai số ±2px ở vài chỗ (ô tìm kiếm
 * thật cao 46px = `min-h-11` + viền 1px hai bên; ở đây làm tròn thành `h-12`).
 * Sai số đó nhỏ hơn nhiều so với việc đoán bừa, nhưng khớp tuyệt đối thì phải
 * đo trên trình duyệt với dữ liệu thật.
 */

/**
 * Phần đầu trang: tiêu đề, và tùy trang thì thêm ô tìm kiếm / hàng tab.
 *
 * CHỈ dùng ở fallback cấp route. Khi trang đã mount, phần đầu là nội dung THẬT
 * — nó không phụ thuộc dữ liệu mạng nên không có lý do gì để vẽ khung xương.
 */
function PageHeaderSkeleton({ search = false, tabs = 0 }: { search?: boolean; tabs?: number }) {
  return (
    <div className="space-y-3">
      {/* `h-8` xấp xỉ hộp dòng của `text-title` (24px). */}
      <Skeleton className="h-8 w-40" />

      {search ? <Skeleton className="rounded-control-lg h-12 w-full" /> : null}

      {tabs > 0 ? (
        // `pb-1` khớp `Tabs`, để hàng tab thật không nhích lên khi thay vào.
        <div className="flex gap-2 pb-1">
          {Array.from({ length: tabs }, (_, index) => (
            // Bề rộng so le: một hàng bốn viên bằng chằn chặn đọc ra là bảng
            // biểu, không phải nhãn chữ.
            <Skeleton key={index} className={`h-11 rounded-full ${TAB_WIDTHS[index % 4]}`} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

const TAB_WIDTHS = ['w-20', 'w-24', 'w-24', 'w-20'] as const

/** Danh sách thẻ từ — dùng chung cho màn Tìm kiếm và màn Kho từ. */
export function VocabularyListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <VocabularyCardSkeleton key={index} />
      ))}
    </div>
  )
}

/** Nút quay lại ở đầu hai màn chi tiết. */
function BackLinkSkeleton() {
  return <Skeleton className="h-10 w-24" />
}

export function WordDetailSkeleton() {
  return (
    <div className="space-y-4">
      <BackLinkSkeleton />
      {/* `rounded-hero` khớp `WordDetailHero`. */}
      <Skeleton className="rounded-hero h-48 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

/**
 * `back` nhận nút quay lại THẬT khi trang đã mount.
 *
 * Không phải chi tiết trang trí: phân tích câu mất 3-5 giây lần đầu, và trong
 * quãng đó nút thoát phải BẤM ĐƯỢC. Vẽ xương đè lên nó là giam người dùng lại
 * trong lúc chờ lâu nhất của cả app.
 *
 * Chỉ fallback cấp route mới rơi vào nhánh xương, vì lúc đó chunk trang chưa
 * về nên chưa hề có nút thật nào để truyền vào.
 */
export function SentenceDetailSkeleton({ back }: { back?: ReactNode }) {
  return (
    <div className="space-y-4">
      {back ?? <BackLinkSkeleton />}
      <Skeleton className="rounded-hero h-32 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}

/** Danh sách phiên đã ôn — hình dạng KHÁC hẳn thẻ ôn tập. */
export function ReviewHistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="rounded-card h-20 w-full" />
      ))}
    </div>
  )
}

export function ReviewSkeleton() {
  return (
    <div className="space-y-4">
      {/* `h-2` là thanh tiến độ, không phải một dòng chữ. */}
      <Skeleton className="h-2 w-full" />
      <Skeleton className="rounded-hero h-56 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  )
}

/**
 * Vỏ thẻ THẬT bọc quanh xương.
 *
 * Cùng khuôn `VocabularyCardSkeleton` đã dùng: vẽ `bg-surface shadow-card` như
 * thẻ thường rồi đặt thanh xương bên trong, thay vì tô một khối đặc hình thẻ.
 * Nhờ vậy `p-4` và bo góc là của chính component thật, nên đổi `Card` thì khung
 * xương đi theo.
 */
function CardShellSkeleton({ children }: { children: ReactNode }) {
  return <div className="bg-surface shadow-card rounded-card p-4">{children}</div>
}

/**
 * Chiều cao ở đây SUY RA từ cấu trúc thật, không phải áng chừng.
 *
 * Bản cũ tô ba khối đặc `h-40` / `h-20` / `h-36` và cả ba đều lệch:
 *   - Thẻ biểu đồ: `LineChart` là SVG `w-full` tỉ lệ 320:120, nên cao 117px ở
 *     màn 375px và 264px ở bề rộng tối đa. KHÔNG một chiều cao cố định nào khớp
 *     được — `h-40` (160px) hụt 55px ở mobile và hụt 104px ở desktop. Đây là
 *     nguyên nhân nhảy layout lớn nhất của màn này, và nó chỉ lộ ra khi tính
 *     theo tỉ lệ khung hình chứ không phải khi nhìn.
 *   - `StatCard` cao đúng 72px (`p-4` 32 + caption 18 + section 22), không phải
 *     80px của `h-20`.
 *
 * `aspect-320/120` sao chép đúng `viewBox` của `LineChart`, nên xương co giãn
 * cùng nhịp với biểu đồ thật ở mọi bề rộng.
 */
export function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <CardShellSkeleton>
        <div className="space-y-1">
          <Skeleton className="h-4.5 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="mt-3">
          <Skeleton className="aspect-320/120 w-full" />
        </div>
      </CardShellSkeleton>

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="bg-surface shadow-card rounded-card flex items-center gap-3 p-4"
          >
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4.5 w-10" />
              <Skeleton className="h-5.5 w-8" />
            </div>
          </div>
        ))}
      </div>

      <CardShellSkeleton>
        <Skeleton className="h-5.5 w-28" />
        <div className="mt-3 flex items-center gap-5">
          {/* `size-28` khớp `DonutChart`; tròn vì biểu đồ thật là hình tròn. */}
          <Skeleton className="size-28 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            {/* Năm lát, đúng số mục chú giải của `DonutChart`. */}
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-5.5 w-full max-w-40" />
            ))}
          </div>
        </div>
      </CardShellSkeleton>
    </div>
  )
}

/**
 * Chỉ RUỘT của thẻ tài khoản, không gồm thẻ.
 *
 * `AccountPage` vẽ `<Card>` thật ngay cả lúc đang tải — thẻ không chờ dữ liệu
 * nào cả. Bọc thêm một khung xương hình thẻ ở đây sẽ thành hai lớp chồng nhau.
 */
export function AccountCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-48" />
    </div>
  )
}

/**
 * Khung xương cấp ROUTE, chọn theo pathname.
 *
 * Chỉ chạy trong lúc chunk của trang lười đang tải, nên nó phải dựng cả phần
 * đầu trang — thứ mà bản thân trang vẽ ngay không cần đợi mạng.
 *
 * Là COMPONENT chứ không phải hàm `pageSkeletonFor(pathname)`, và đó là ràng
 * buộc của lint chứ không phải sở thích: `react-refresh/only-export-components`
 * cấm một file vừa export component vừa export hàm thường — cùng luật đã buộc
 * `lazy-pages.ts` phải tách khỏi `router.tsx`. Viết dưới dạng component thì cả
 * file chỉ export component, và không cần đẻ thêm file thứ hai.
 */
export function PageSkeleton({ pathname }: { pathname: string }): ReactNode {
  if (pathname.startsWith('/words/')) return <WordDetailSkeleton />

  if (pathname.startsWith('/sentence')) return <SentenceDetailSkeleton />

  if (pathname.startsWith('/vocabulary')) {
    return (
      <div className="space-y-4">
        <PageHeaderSkeleton search tabs={4} />
        <VocabularyListSkeleton />
      </div>
    )
  }

  /*
   * TRƯỚC `/review`: `'/review/history'.startsWith('/review')` cũng đúng, nên
   * đảo thứ tự sẽ cho trang lịch sử một khung xương hình THẺ ÔN TẬP — một thẻ
   * lớn và 4 ô lựa chọn — rồi nhảy sang danh sách. Cùng cái bẫy đã ghi ở cặp
   * `/account/settings` vs `/account` bên dưới.
   */
  if (pathname.startsWith('/review/history')) {
    return (
      <div className="space-y-4">
        <PageHeaderSkeleton />
        <ReviewHistorySkeleton />
      </div>
    )
  }

  if (pathname.startsWith('/review')) return <ReviewSkeleton />

  if (pathname.startsWith('/stats')) {
    return (
      <div className="space-y-4">
        <PageHeaderSkeleton tabs={3} />
        <StatsSkeleton />
      </div>
    )
  }

  // TRƯỚC `/account`: `'/account/settings'.startsWith('/account')` cũng đúng,
  // nên đảo thứ tự hai nhánh này sẽ khiến màn Hiển thị & chữ không bao giờ khớp.
  if (pathname.startsWith('/account/settings')) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <Skeleton className="rounded-hero h-40 w-full" />
        <Skeleton className="rounded-card h-32 w-full" />
        <Skeleton className="rounded-card h-32 w-full" />
      </div>
    )
  }

  if (pathname.startsWith('/account')) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="rounded-card h-19 w-full" />
        <Skeleton className="rounded-card h-32 w-full" />
      </div>
    )
  }

  /*
   * Lưới an toàn cho route chưa có khung xương riêng — hiện chỉ có `/__gallery`,
   * trang kiểm tra thị giác nội bộ.
   *
   * `/search` và bốn màn auth KHÔNG bao giờ tới đây: chúng nằm trong bundle
   * chính (`router.tsx` import thẳng), nên không hề đi qua `Suspense`.
   */
  return <Skeleton className="rounded-card h-64 w-full" />
}
