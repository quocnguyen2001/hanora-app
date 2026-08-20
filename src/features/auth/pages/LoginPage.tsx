import { Link, useLocation, useNavigate } from 'react-router'
import { AuthForm } from '../components/AuthForm'
import { useLogin } from '../hooks'
import { AuthLayout } from '../components/AuthLayout'

export function LoginPage() {
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()

  // Quay lại đúng chỗ người dùng định tới trước khi bị chặn.
  const redirect = (location.state as { redirect?: string } | null)?.redirect ?? '/search'

  return (
    <AuthLayout title="Chào mừng trở lại" subtitle="Đăng nhập để tiếp tục học.">
      <AuthForm
        fields={[
          { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
          {
            name: 'password',
            label: 'Mật khẩu',
            type: 'password',
            autoComplete: 'current-password',
          },
        ]}
        submitLabel="Đăng nhập"
        pending={login.isPending}
        error={login.error}
        onSubmit={(values) =>
          login.mutate(
            { email: values.email ?? '', password: values.password ?? '' },
            { onSuccess: () => void navigate(redirect, { replace: true }) },
          )
        }
        footer={
          <div className="text-body space-y-2 text-center">
            <Link to="/forgot-password" className="text-text-secondary underline">
              Quên mật khẩu?
            </Link>
            <p className="text-text-secondary">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="text-primary font-medium">
                Đăng ký
              </Link>
            </p>
          </div>
        }
      />
    </AuthLayout>
  )
}
