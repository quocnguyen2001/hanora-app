/**
 * Client HTTP dùng chung cho toàn app.
 *
 * Mọi response thành công của API bọc trong `{ data }`, list có thêm `meta`
 * (quy ước chốt ở P1). Hàm ở đây bóc lớp `data` ra để caller không phải nhớ.
 * Khi cần `meta` — phân trang — dùng `apiRequestWithMeta`.
 */

/** Lỗi validation Laravel: map từ tên field sang danh sách message. */
export type ApiValidationErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly errors: ApiValidationErrors
  readonly code: string | null

  constructor(
    message: string,
    status: number,
    errors: ApiValidationErrors = {},
    options?: ErrorOptions & { code?: string },
  ) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.code = options?.code ?? null
  }

  /** 422 — người dùng nhập sai, hiển thị lỗi ngay tại field. */
  get isValidationError(): boolean {
    return this.status === 422
  }

  /** 401 — token hết hạn hoặc bị thu hồi, cần đá về màn đăng nhập. */
  get isUnauthenticated(): boolean {
    return this.status === 401
  }

  /**
   * Không có phản hồi nào từ server — mất mạng, DNS hỏng, request bị hủy.
   * Phân biệt với lỗi HTTP thật để UI offline nói đúng chuyện đang xảy ra
   * thay vì báo "lỗi máy chủ".
   */
  get isNetworkError(): boolean {
    return this.status === 0
  }

  /**
   * Thao tác GHI bị chặn vì đang ngoại tuyến.
   *
   * D4: offline chỉ ĐỌC. Không có hàng đợi mutation, không sync/merge ở MVP.
   * Cờ này để UI hiện đúng thông điệp "cần kết nối" thay vì một lỗi mạng chung
   * chung — và tuyệt đối không giả vờ đã lưu.
   */
  get isOfflineWrite(): boolean {
    return this.status === 0 && this.code === 'offline_write'
  }
}

/**
 * Để trống ở production: FE và API dùng chung origin (D12) nên đường dẫn tương
 * đối là đúng. Ở dev, Vite chạy cổng khác API nên cần URL tuyệt đối.
 */
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/**
 * Bốn endpoint auth công khai.
 *
 * Loại chúng khỏi xử lý 401 để không tạo VÒNG LẶP CHUYỂN HƯỚNG: sai mật khẩu
 * trả 401 từ `login`, nếu cái đó cũng kích hoạt "xóa phiên rồi về /login" thì
 * màn đăng nhập tự đá chính nó, và người dùng thấy trang nháy liên tục thay vì
 * đọc được thông báo sai mật khẩu.
 */
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
]

/**
 * Chạy khi nhận HTTP 401 THẬT — không phải khi mất mạng.
 *
 * `app/providers.tsx` gắn hàm dọn phiên vào đây. Để `lib/api.ts` tự import
 * `QueryClient` sẽ tạo phụ thuộc vòng giữa tầng HTTP và tầng React.
 */
let onUnauthenticated: (() => void) | null = null

export function setUnauthenticatedHandler(handler: (() => void) | null): void {
  onUnauthenticated = handler
}

/** Token đọc ngay lúc gọi, không cache — đăng xuất phải có hiệu lực tức thì. */
let tokenReader: (() => string | null) | null = null

export function setTokenReader(reader: (() => string | null) | null): void {
  tokenReader = reader
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  /** Object sẽ được JSON.stringify; truyền `undefined` cho request không body. */
  body?: unknown
  /**
   * Cố tình hẹp hơn `HeadersInit`: bên dưới dùng object spread, mà spread một
   * `Headers` cho ra `{}` và spread một mảng cặp cho ra `{0: [...]}` — cả hai
   * đều lọt qua TypeScript rồi âm thầm mất header.
   */
  headers?: Record<string, string>
  /** Query string, bỏ qua các giá trị `undefined` và `null`. */
  query?: Record<string, string | number | boolean | undefined | null>
}

interface ApiEnvelope<T> {
  data: T
  meta?: unknown
}

function buildUrl(path: string, query: ApiRequestOptions['query']): string {
  const url = `${BASE_URL}/api${path.startsWith('/') ? path : `/${path}`}`

  if (!query) return url

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    params.set(key, String(value))
  }

  const queryString = params.toString()
  return queryString ? `${url}?${queryString}` : url
}

/** Response hợp lệ nhưng cố ý không có body — `DELETE` trả 204 chẳng hạn. */
function isBodyless(response: Response): boolean {
  return response.status === 204 || response.status === 205
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    // Server trả HTML (trang lỗi nginx, trang maintenance) thay vì JSON.
    throw new ApiError('Máy chủ trả về dữ liệu không đọc được.', response.status)
  }
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const { message } = payload
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

function extractValidationErrors(payload: unknown): ApiValidationErrors {
  if (!payload || typeof payload !== 'object' || !('errors' in payload)) return {}

  const { errors } = payload
  if (!errors || typeof errors !== 'object') return {}

  return errors as ApiValidationErrors
}

/**
 * Gọi API và trả về cả `data` lẫn `meta`.
 *
 * @throws {ApiError} với `status` 0 khi không kết nối được tới server.
 */
export async function apiRequestWithMeta<T>(
  path: string,
  { body, query, headers, ...init }: ApiRequestOptions = {},
): Promise<ApiEnvelope<T>> {
  let response: Response

  const token = tokenReader?.() ?? null
  const method = (init.method ?? 'GET').toUpperCase()

  /*
   * Chặn thao tác GHI khi rõ ràng đang ngoại tuyến (D4).
   *
   * Chặn ở đây thay vì để `fetch` tự fail cho ra thông điệp ĐÚNG: người dùng
   * biết thao tác cần kết nối, chứ không phải "có lỗi xảy ra". Đọc thì vẫn cho
   * đi qua — service worker có thể phục vụ từ cache.
   *
   * `navigator.onLine` chỉ đáng tin theo một chiều: `false` thì chắc chắn không
   * có mạng. `true` không hứa gì, và trường hợp đó vẫn rơi vào nhánh lỗi mạng
   * bình thường bên dưới.
   */
  if (
    method !== 'GET' &&
    method !== 'HEAD' &&
    typeof navigator !== 'undefined' &&
    !navigator.onLine
  ) {
    throw new ApiError(
      'Bạn đang ngoại tuyến. Thao tác này cần kết nối.',
      0,
      {},
      {
        code: 'offline_write',
      },
    )
  }

  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch (cause) {
    // Request bị hủy có chủ đích — P7 hủy request cũ ở mỗi phím gõ. Đó không
    // phải lỗi mạng: bọc nó lại sẽ khiến UI báo "mất mạng" và query client
    // retry đúng cái request vừa được yêu cầu bỏ đi.
    if (init.signal?.aborted || (cause instanceof Error && cause.name === 'AbortError')) {
      throw cause
    }
    throw new ApiError('Không kết nối được tới máy chủ.', 0, {}, { cause })
  }

  const payload = isBodyless(response) ? undefined : await parseJson(response)

  if (!response.ok) {
    /*
     * 401 THẬT nghĩa là token hết hạn hoặc bị thu hồi → xóa phiên.
     *
     * Mất mạng KHÔNG đi qua đây: nó ném ở khối catch bên trên và tuyệt đối
     * không đụng tới phiên. Trộn hai thứ này là cách chắc chắn để người dùng
     * bật chế độ máy bay và bị đá ra khỏi tài khoản — đúng thứ phá tiêu chí
     * offline của MVP (red team C5).
     */
    if (response.status === 401 && !PUBLIC_AUTH_PATHS.some((p) => path.startsWith(p))) {
      onUnauthenticated?.()
    }

    throw new ApiError(
      extractMessage(payload, 'Đã có lỗi xảy ra. Vui lòng thử lại.'),
      response.status,
      extractValidationErrors(payload),
    )
  }

  // 204/205 không có body theo đúng đặc tả — `DELETE /api/vocabulary/{id}`
  // dùng nó. Coi đó là sai định dạng sẽ làm optimistic update rollback một
  // thao tác xóa đã thành công.
  if (isBodyless(response)) {
    return { data: undefined as T }
  }

  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    throw new ApiError('Phản hồi từ máy chủ sai định dạng.', response.status)
  }

  return payload as ApiEnvelope<T>
}

/** Như `apiRequestWithMeta` nhưng chỉ trả phần `data`. */
export async function apiRequest<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  const { data } = await apiRequestWithMeta<T>(path, options)
  return data
}
