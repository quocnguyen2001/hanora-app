import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ApiError } from '@/lib/api'

export interface AuthField {
  name: string
  label: string
  type?: string
  autoComplete?: string
  placeholder?: string
}

/**
 * Form dùng chung cho đăng nhập, đăng ký, quên/đặt lại mật khẩu.
 *
 * Hiển thị lỗi 422 THEO TỪNG FIELD: một thông báo chung ở đầu form buộc người
 * dùng tự đoán ô nào sai, và với form đăng ký 4 ô thì đó là ba lần đoán.
 */
export function AuthForm({
  fields,
  submitLabel,
  onSubmit,
  pending,
  error,
  footer,
}: {
  fields: readonly AuthField[]
  submitLabel: string
  onSubmit: (values: Record<string, string>) => void
  pending?: boolean
  error?: unknown
  footer?: ReactNode
}) {
  const [values, setValues] = useState<Record<string, string>>({})

  const apiError = error instanceof ApiError ? error : null
  const fieldErrors = apiError?.errors ?? {}

  // Lỗi không thuộc field nào — sai mật khẩu, mất mạng — hiện ở đầu form.
  const generalError =
    apiError && Object.keys(fieldErrors).length === 0 ? apiError.message : undefined

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {generalError && (
        <p role="alert" className="bg-error/10 text-body text-error rounded-control p-3">
          {generalError}
        </p>
      )}

      {fields.map((field) => (
        <Input
          key={field.name}
          label={field.label}
          type={field.type ?? 'text'}
          autoComplete={field.autoComplete}
          placeholder={field.placeholder}
          value={values[field.name] ?? ''}
          error={fieldErrors[field.name]?.[0]}
          onChange={(event) =>
            setValues((current) => ({ ...current, [field.name]: event.target.value }))
          }
        />
      ))}

      <Button type="submit" fullWidth size="lg" loading={pending}>
        {submitLabel}
      </Button>

      {footer}
    </form>
  )
}
