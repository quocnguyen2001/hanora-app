import { Link, useNavigate } from 'react-router'
import { ChevronRightIcon, SettingsIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { useLogout, useMe } from '../hooks'

export function AccountPage() {
  const { data, isPending } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h1 className="text-title">Tài khoản</h1>

      <Card>
        {isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : (
          <div>
            <p className="text-section text-text-primary">{data?.user.name}</p>
            <p className="text-body text-text-secondary">{data?.user.email}</p>
          </div>
        )}
      </Card>

      {/*
        Lối vào Settings đứng TRƯỚC khối "Về hanora" và cách xa nút Đăng xuất.

        Đăng xuất là hành động hiếm và cần tách bạch (`ux-rules.md`); nhét một
        hàng bấm được ngay cạnh nó là mời người dùng bấm nhầm.
      */}
      <Link
        to="/account/settings"
        className={cn(
          'bg-surface shadow-card rounded-card flex items-center gap-3 p-4',
          'duration-press ease-soft transition active:scale-[0.99]',
          'hover:bg-primary-pale active:bg-primary-soft',
        )}
      >
        <span className="text-primary">
          <SettingsIcon size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-section text-text-primary block">Hiển thị &amp; chữ</span>
          <span className="text-caption text-text-secondary block">
            Chủ đề, font, cỡ chữ, tông chữ
          </span>
        </span>
        <span className="text-text-secondary">
          <ChevronRightIcon size={20} />
        </span>
      </Link>

      <Card>
        <h2 className="text-section">Về hanora</h2>
        {/*
          Nói THẲNG nguồn gốc dữ liệu, không giấu — và đây là bắt buộc chứ không
          phải lịch sự.

          App giờ CÓ nghĩa tiếng Việt, nhưng nghĩa đó dịch bằng AI có người rà,
          không phải từ điển do người biên soạn. Người học cần biết mức tin cậy
          của thứ họ đang học TRƯỚC khi lưu vài chục từ, chứ không phải tự phát
          hiện sau. Đó cũng là điều kiện kèm theo khi chấp nhận nguồn này.
        */}
        <p className="text-body text-text-secondary mt-2">
          hanora chú giải từ bằng <strong>nghĩa tiếng Việt</strong>, <strong>âm Hán-Việt</strong> và{' '}
          <strong>định nghĩa tiếng Anh</strong>. Nghĩa tiếng Việt phủ khoảng <strong>93%</strong> từ
          điển — khoảng 7% từ hiếm chưa có, và những từ đó vẫn xem được bằng tiếng Anh như thường.
        </p>

        {/*
          Câu quan trọng nhất của cả trang. Nó là một nửa của cơ chế giảm nhẹ
          rủi ro "người học tin nghĩa dịch máy là chuẩn"; nửa còn lại là dòng
          tiếng Anh luôn hiển thị cạnh nghĩa Việt trên thẻ từ.

          Không làm nhẹ đi câu này. Nói "dịch bằng AI" mà không nói "có thể sai"
          là nói một nửa.
        */}
        <p className="text-body text-text-secondary mt-2">
          Nghĩa tiếng Việt được <strong>dịch bằng AI và có người rà lại</strong>, không phải từ điển
          do người biên soạn — nên vẫn có thể còn chỗ sai. Vì vậy{' '}
          <strong>định nghĩa tiếng Anh luôn hiển thị cạnh bên</strong> để bạn đối chiếu khi thấy
          nghi ngờ. Âm Hán-Việt thì là <em>âm đọc</em>, không phải nghĩa: 东西 đọc là “đông tây”
          nhưng nghĩa là “thứ, đồ vật”.
        </p>

        <h3 className="text-body mt-4 font-medium">Nguồn dữ liệu</h3>
        <ul className="text-caption text-text-secondary mt-1 space-y-1">
          <li>
            Từ điển:{' '}
            <a href="https://cc-cedict.org/" className="underline">
              CC-CEDICT
            </a>{' '}
            — giấy phép CC BY-SA 4.0
          </li>
          <li>
            Âm Hán-Việt:{' '}
            <a href="https://unicode.org/charts/unihan.html" className="underline">
              Unihan
            </a>{' '}
            — Unicode License
          </li>
          {/*
            Tatoeba chỉ xuất hiện ở đây VÌ P13 đã thật sự import dữ liệu. Nếu
            phase đó đóng theo nhánh gate-fail thì dòng này phải gỡ hẳn — ghi
            công một nguồn không dùng là sai theo hướng ngược lại.

            Tác giả của TỪNG CÂU hiển thị ngay dưới câu đó ở màn chi tiết từ;
            đây là phần ghi công cấp ứng dụng.
          */}
          <li>
            Câu ví dụ:{' '}
            <a href="https://tatoeba.org/" className="underline">
              Tatoeba
            </a>{' '}
            — CC BY 2.0 FR, ghi công từng câu theo tác giả
          </li>
          {/*
            CVDICT thay chỗ VNEDICT. Khác biệt không chỉ là tên nguồn: VNEDICT
            chỉ dùng để khớp truy vấn và không hiển thị ở đâu, còn nội dung
            CVDICT thì người học ĐỌC.

            Vì thế dòng này nói cả nguồn gốc dịch máy, không chỉ tên và giấy
            phép — ghi công là nghĩa vụ CC BY-SA, còn nói rõ nguồn gốc là nghĩa
            vụ với người học.
          */}
          <li>
            Nghĩa tiếng Việt:{' '}
            <a href="https://github.com/ph0ngp/CVDICT" className="underline">
              CVDICT
            </a>{' '}
            — CC BY-SA 4.0, dịch từ CC-CEDICT bằng AI và có người rà lại
          </li>
        </ul>
      </Card>

      <Button
        variant="destructive"
        fullWidth
        loading={logout.isPending}
        onClick={() => logout.mutate(undefined, { onSuccess: () => void navigate('/login') })}
      >
        Đăng xuất
      </Button>
    </div>
  )
}
