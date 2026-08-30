import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Giọng đọc người dùng chọn — state CLIENT, đúng chỗ cho Zustand.
 *
 * Không đồng bộ lên server, và đó là quyết định chứ không phải bước còn thiếu:
 * danh sách giọng do HỆ ĐIỀU HÀNH cung cấp và khác nhau giữa các máy. Đồng bộ
 * một `voiceURI` chỉ có trên macOS sang điện thoại Android là đồng bộ một giá
 * trị vô nghĩa.
 *
 * KHÔNG xóa khi đăng xuất — cùng lập luận đã áp cho `display` và `search-mode`:
 * tùy chọn của thiết bị không phải dữ liệu theo người dùng.
 */
export const STORAGE_KEY = 'hanora.voice'

interface VoiceState {
  /**
   * `null` = Tự động: để `audio.ts` chấm điểm chọn hộ. Đây là mặc định, và cũng
   * là hành vi duy nhất tồn tại trước khi có màn cài đặt này.
   */
  voiceURI: string | null
  setVoice: (voiceURI: string | null) => void
}

export const useVoice = create<VoiceState>()(
  persist(
    (set) => ({
      voiceURI: null,
      /*
       * Chuỗi rỗng quy về `null`. Vài bản Chrome trên Android trả giọng có
       * `voiceURI === ''`; lưu nguyên chuỗi đó thì màn cài đặt coi là "đã chọn"
       * và tô sáng hàng, còn `speak()` thấy giá trị falsy nên rơi về chấm điểm.
       * Màn hình nói một đằng, tai nghe một nẻo, không dấu hiệu nào.
       */
      setVoice: (voiceURI) => set({ voiceURI: voiceURI || null }),
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
