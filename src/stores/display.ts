import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  DEFAULT_DISPLAY,
  STORAGE_KEY,
  type DisplaySettings,
  type FontChoice,
  type MotionChoice,
  type TextTone,
  type Theme,
} from '@/lib/display-theme'

/**
 * Tùy chỉnh hiển thị — state CLIENT, đúng chỗ cho Zustand.
 *
 * Không đồng bộ lên server, và đó là quyết định chứ không phải bước còn thiếu:
 * đây là tùy chọn của THIẾT BỊ. Người dùng chỉnh cỡ chữ to trên điện thoại
 * không có nghĩa họ muốn chữ to trên laptop.
 *
 * KHÔNG xóa khi đăng xuất — cùng lập luận đã áp cho `search-mode`: tùy chọn
 * giao diện của thiết bị không phải dữ liệu theo người dùng, nên nó không nằm
 * trong `clearSession()`. Bắt người ta chỉnh lại chế độ tối sau mỗi lần đăng
 * xuất là hành vi sai.
 */
interface DisplayState extends DisplaySettings {
  setTheme: (theme: Theme) => void
  setFont: (font: FontChoice) => void
  setFontScale: (fontScale: number) => void
  setTextTone: (textTone: TextTone) => void
  setMotion: (motion: MotionChoice) => void
  reset: () => void
}

export const useDisplay = create<DisplayState>()(
  persist(
    (set) => ({
      ...DEFAULT_DISPLAY,
      setTheme: (theme) => set({ theme }),
      setFont: (font) => set({ font }),
      setFontScale: (fontScale) => set({ fontScale }),
      setTextTone: (textTone) => set({ textTone }),
      setMotion: (motion) => set({ motion }),
      reset: () => set({ ...DEFAULT_DISPLAY }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() =>
        // `window.localStorage`, KHÔNG phải `localStorage` trần: Node 26 có một
        // global `localStorage` riêng và nó bị tắt nếu không có `--localstorage-file`.
        typeof window !== 'undefined' && window.localStorage
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
)

/** Chỉ phần giá trị, không gồm setter — dùng cho `applyDisplay`. */
export function selectDisplaySettings(state: DisplayState): DisplaySettings {
  return {
    theme: state.theme,
    font: state.font,
    fontScale: state.fontScale,
    textTone: state.textTone,
    motion: state.motion,
  }
}
