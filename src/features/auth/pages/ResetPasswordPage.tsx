import { Link, useNavigate, useSearchParams } from 'react-router'
import { AuthForm } from '../components/AuthForm'
import { AuthLayout } from '../components/AuthLayout'
import { useResetPassword } from '../hooks'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const reset = useResetPassword()
  const navigate = useNavigate()

  // Link trong mail do API dựng: /reset-password?token=...&email=...
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  if (token === '' || email === '') {
    return (
      <AuthLayout title="Liên kết không hợp lệ">
        <p className="text-body text-text-secondary text-center">
          Liên kết đặt lại mật khẩu đã hỏng hoặc thiếu thông tin. Hãy yêu cầu một liên kết mới.
        </p>
        <p className="text-body text-center">
          <Link to="/forgot-password" className="text-primary font-medium">
            Gửi lại liên kết
          </Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Đặt mật khẩu mới" subtitle={email}>
      <AuthForm
        fields={[
          {
            name: 'password',
            label: 'Mật khẩu mới',
            type: 'password',
            autoComplete: 'new-password',
          },
          {
            name: 'password_confirmation',
            label: 'Nhập lại mật khẩu',
            type: 'password',
            autoComplete: 'new-password',
          },
        ]}
        submitLabel="Đặt lại mật khẩu"
        pending={reset.isPending}
        error={reset.error}
        onSubmit={(values) =>
          reset.mutate(
            {
              token,
              email,
              password: values.password ?? '',
              password_confirmation: values.password_confirmation ?? '',
            },
            // Đổi mật khẩu thu hồi mọi token cũ (P9), nên bắt buộc đăng nhập lại.
            { onSuccess: () => void navigate('/login', { replace: true }) },
          )
        }
      />
    </AuthLayout>
  )
}
