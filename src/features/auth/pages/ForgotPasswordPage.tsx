import { Link } from 'react-router'
import { AuthForm } from '../components/AuthForm'
import { AuthLayout } from '../components/AuthLayout'
import { useForgotPassword } from '../hooks'

export function ForgotPasswordPage() {
  const forgot = useForgotPassword()

  if (forgot.isSuccess) {
    return (
      <AuthLayout title="Đã gửi email">
        {/*
          Thông báo cố tình KHÔNG xác nhận email có tồn tại hay không — API cũng
          trả 204 cho cả hai trường hợp, vì phân biệt sẽ rò rỉ đúng thứ mà màn
          đăng nhập đã cẩn thận không tiết lộ.
        */}
        <p className="text-body text-text-secondary text-center">
          Nếu email này đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.
        </p>
        <p className="text-body text-center">
          <Link to="/login" className="text-primary font-medium">
            Về trang đăng nhập
          </Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Quên mật khẩu" subtitle="Nhập email để nhận liên kết đặt lại.">
      <AuthForm
        fields={[{ name: 'email', label: 'Email', type: 'email', autoComplete: 'email' }]}
        submitLabel="Gửi liên kết"
        pending={forgot.isPending}
        error={forgot.error}
        onSubmit={(values) => forgot.mutate(values.email ?? '')}
        footer={
          <p className="text-body text-center">
            <Link to="/login" className="text-text-secondary underline">
              Quay lại đăng nhập
            </Link>
          </p>
        }
      />
    </AuthLayout>
  )
}
