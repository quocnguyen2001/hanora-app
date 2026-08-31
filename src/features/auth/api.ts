import { apiRequest } from '@/lib/api'

export interface AuthUser {
  id: number
  name: string
  email: string
  created_at: string | null
}

interface AuthSession {
  user: AuthUser
  token: string
}

export interface StreakBrief {
  current: number
  met_today: boolean
}

/** Tên thiết bị ghi vào `personal_access_tokens.name` — giúp người dùng nhận ra phiên. */
function deviceName(): string {
  if (typeof navigator === 'undefined') return 'web'

  return navigator.userAgent.slice(0, 64)
}

export function register(input: {
  name: string
  email: string
  password: string
  password_confirmation: string
}): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/register', {
    method: 'POST',
    body: { ...input, device_name: deviceName() },
  })
}

export function login(input: { email: string; password: string }): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: { ...input, device_name: deviceName() },
  })
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}

/**
 * Người dùng hiện tại, kèm chuỗi ngày.
 *
 * `streak` ở đây tồn tại vì response này ĐƯỢC service worker cache (bucket dữ
 * liệu cá nhân, `NetworkFirst`) còn `/streak` thì cố ý `no-store`. Nó là đường
 * duy nhất chip lửa có số khi mở app lúc ngoại tuyến.
 *
 * Optional vì hai lẽ: bản cache cũ từ trước khi API thêm trường, và
 * `useLogin` ghi thẳng `{ user }` vào cache mà không có chuỗi.
 */
export function me(): Promise<{ user: AuthUser; streak?: StreakBrief }> {
  return apiRequest<{ user: AuthUser; streak?: StreakBrief }>('/auth/me')
}

export function forgotPassword(email: string): Promise<void> {
  return apiRequest<void>('/auth/forgot-password', { method: 'POST', body: { email } })
}

export function resetPassword(input: {
  token: string
  email: string
  password: string
  password_confirmation: string
}): Promise<void> {
  return apiRequest<void>('/auth/reset-password', { method: 'POST', body: input })
}
