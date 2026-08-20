import { useEffect, useState } from 'react'

/**
 * Hoãn giá trị cho tới khi người dùng ngừng gõ.
 *
 * 250ms là ngưỡng để KHÔNG gọi API mỗi phím gõ mà vẫn thấy tức thì. Gọi mỗi
 * phím thì gõ `học tập` là 7 request, 6 trong số đó vô ích và tất cả đều tính
 * vào trần throttle 60/phút của người dùng.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)

    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
