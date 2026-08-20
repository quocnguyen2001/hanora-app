import { Link, useNavigate } from 'react-router'
import { AuthForm } from '../components/AuthForm'
import { AuthLayout } from '../components/AuthLayout'
import { useRegister } from '../hooks'

export function RegisterPage() {
  const register = useRegister()
  const navigate = useNavigate()

  return (
    <AuthLayout title="Bắt đầu với hanora" subtitle="Tạo tài khoản để lưu và ôn tập từ vựng.">
      <AuthForm
        fields={[
          { name: 'name', label: 'Tên của bạn', autoComplete: 'name' },
          { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
          {
            name: 'password',
            label: 'Mật khẩu',
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
        submitLabel="Tạo tài khoản"
        pending={register.isPending}
        error={register.error}
        onSubmit={(values) =>
          register.mutate(
            {
              name: values.name ?? '',
              email: values.email ?? '',
              password: values.password ?? '',
              password_confirmation: values.password_confirmation ?? '',
            },
            { onSuccess: () => void navigate('/search', { replace: true }) },
          )
        }
        footer={
          <p className="text-body text-text-secondary text-center">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary font-medium">
              Đăng nhập
            </Link>
          </p>
        }
      />
    </AuthLayout>
  )
}
