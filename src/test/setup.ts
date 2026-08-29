import '@testing-library/jest-dom/vitest'

/**
 * Polyfill `localStorage` cho môi trường test.
 *
 * Hai thứ chồng lên nhau tạo ra khoảng trống này:
 *
 * 1. **jsdom trong cấu hình hiện tại không dựng `window.localStorage`.**
 * 2. **Node 26 có global `localStorage` của riêng nó**, và nó bị tắt nếu không
 *    chạy kèm `--localstorage-file` — global đó còn che mất bản của jsdom.
 *
 * Hệ quả: zustand persist ném `Cannot read properties of undefined (reading
 * 'setItem')` ngay lần `setState` đầu tiên. Trình duyệt thật không có vấn đề
 * này, nên chỗ cần vá là môi trường test chứ không phải nới lỏng store.
 *
 * Bản polyfill dưới đây giữ trong RAM và reset theo từng process test — đúng
 * hành vi ta muốn: không test nào rò trạng thái đăng nhập sang test khác.
 */
function createMemoryStorage(): Storage {
  const entries = new Map<string, string>()

  return {
    get length() {
      return entries.size
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, String(value)),
    removeItem: (key: string) => void entries.delete(key),
    clear: () => entries.clear(),
  }
}

if (typeof window !== 'undefined' && !window.localStorage) {
  Object.defineProperty(window, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
  })
}

/**
 * Stub `Element.scrollIntoView` — jsdom không cài đặt nó.
 *
 * `TypingCard` gọi hàm này để kéo ô nhập lên giữa màn hình khi bàn phím ảo mở
 * ra. Trình duyệt thật có, jsdom thì ném `TypeError` và làm hỏng cả test file
 * chứ không chỉ một assertion. Vá ở môi trường test chứ không bọc `try/catch`
 * quanh mã sản phẩm cho một vấn đề chỉ tồn tại khi chạy test.
 */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
