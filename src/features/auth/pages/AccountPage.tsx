import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useLogout, useMe } from '../hooks'

export function AccountPage() {
  const { data, isPending } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tài khoản</h1>

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

      <Card>
        <h2 className="text-section">Về hanora</h2>
        {/*
          Nói THẲNG giới hạn của dữ liệu, không giấu.

          App chú giải bằng âm Hán-Việt và định nghĩa tiếng Anh, KHÔNG phải nghĩa
          tiếng Việt biên soạn. Với từ Hán-Việt thì âm trùng nghĩa (`học tập`),
          nhưng với từ khẩu ngữ thì không (`东西` đọc `đông tây`, nghĩa là "thứ,
          đồ vật"). Người dùng phải biết điều này TRƯỚC khi lưu vài chục từ, chứ
          không phải tự phát hiện sau.
        */}
        <p className="text-body text-text-secondary mt-2">
          hanora chú giải từ bằng <strong>âm Hán-Việt</strong> và{' '}
          <strong>định nghĩa tiếng Anh</strong>, không phải nghĩa tiếng Việt biên soạn. Với phần lớn
          từ Hán-Việt thì âm đọc cũng chính là nghĩa, nhưng với từ khẩu ngữ thì không — ví dụ 东西
          đọc là “đông tây” nhưng nghĩa là “thứ, đồ vật”. Vì vậy định nghĩa tiếng Anh luôn hiển thị
          cùng, và bạn cần biết tiếng Anh cơ bản để dùng app.
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
