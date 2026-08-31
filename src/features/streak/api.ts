import { apiRequest } from '@/lib/api'

/**
 * Trạng thái chuỗi mà ĐƯỜNG GHI trả về.
 *
 * `POST /vocabulary` và `POST /reviews/sessions/{id}/finish` mang nó ở cấp
 * envelope (cạnh `data`), cùng chỗ mà `/dictionary/search` đặt `translation`.
 *
 * `advanced` là nguồn sự thật duy nhất cho lời chúc mừng: màn tổng kết chỉ mount
 * SAU khi mutation xong nên nó không bao giờ quan sát được giá trị "trước".
 */
export interface StreakDelta {
  current: number
  met_today: boolean
  advanced: boolean
}

export interface StreakDay {
  date: string
  met: boolean
}

export interface StreakSnapshot {
  current: number
  longest: number
  met_today: boolean
  today: {
    words_added: number
    session_finished: boolean
    words_goal: number
  }
  /** Chỉ có khi hỏi `?calendar=1` — xem `fetchStreak`. */
  calendar?: StreakDay[]
}

/**
 * Chip trên header gọi hàm này ở MỌI màn, nên mặc định không lấy lịch: lịch 30
 * ngày là hai truy vấn gộp bên API và chỉ màn `/streak` cần tới.
 */
export function fetchStreak(withCalendar = false): Promise<StreakSnapshot> {
  return apiRequest<StreakSnapshot>('/streak', {
    query: withCalendar ? { calendar: 1 } : undefined,
  })
}

/**
 * Bóc `streak` khỏi envelope, có KIỂM hình dạng.
 *
 * `api.ts` ghi rõ luật cho trường cấp cao ngoài `data`: index signature giữ
 * chúng ở kiểu `unknown`, nên *"mỗi chỗ đọc trường phụ phải TỰ kiểm hình dạng"*.
 * Một `as StreakDelta` trần sẽ nói dối TypeScript — và đúng cái đó từng để lọt
 * `null` từ đường `finish` idempotent xuống tận cache của chip.
 */
export function parseStreakDelta(raw: unknown): StreakDelta | undefined {
  if (raw === null || typeof raw !== 'object') return undefined

  const value = raw as Record<string, unknown>

  if (
    typeof value.current !== 'number' ||
    typeof value.met_today !== 'boolean' ||
    typeof value.advanced !== 'boolean'
  ) {
    return undefined
  }

  return { current: value.current, met_today: value.met_today, advanced: value.advanced }
}
