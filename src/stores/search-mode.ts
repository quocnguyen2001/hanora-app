import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Ngôn ngữ đang gõ ở màn Tìm kiếm.
 *
 * `vi` — tìm theo âm Hán-Việt và nghĩa tiếng Việt.
 * `cn` — tìm theo chữ Hán và pinyin.
 */
export type SearchMode = 'vi' | 'cn'

/** `null` = chưa chọn → để API tự đoán như trước khi có toggle. */
export type SearchModeChoice = SearchMode | null

/**
 * Mode tìm kiếm — state CLIENT, đúng chỗ cho Zustand.
 *
 * Lý do nó tồn tại: một chuỗi latin mơ hồ giữa pinyin và tiếng Việt, và phía API
 * `QueryClassifier` phải ĐOÁN. Mọi lỗi xếp hạng của tính năng tìm theo nghĩa
 * tiếng Việt đều là hệ quả của việc đoán đó — `con mèo` bị nén thành `conmeo`
 * rồi trigram trả về 从/聪/葱; `xin chào` trùng `pinyin_plain` của 新潮. Toggle
 * này hỏi thẳng người dùng thay vì đoán.
 *
 * KHÔNG xóa khi đăng xuất. Đây là tùy chọn giao diện của thiết bị, không phải
 * nội dung người dùng gõ — khác lịch sử tìm kiếm, thứ đã được thêm vào
 * `clearSession()` chính vì nó là dữ liệu theo người dùng.
 */
interface SearchModeState {
  mode: SearchModeChoice
  setMode: (mode: SearchMode) => void
}

export const useSearchMode = create<SearchModeState>()(
  persist(
    (set) => ({
      /*
       * Mặc định là `null` — CHƯA CHỌN — chứ không phải `vi`.
       *
       * Plan ban đầu chốt mặc định `vi` vì giao diện là tiếng Việt. Đo trên dữ
       * liệu thật cho thấy như thế làm hỏng tìm pinyin cho mọi người dùng ngay
       * lần mở đầu: `xuexi` chỉ còn 1 kết quả (学习强国 thay vì 学习), `ni hao`
       * trả 653 dòng đứng đầu là 着/用/吃. Tệ hơn nữa, những ca đó có
       * `total > 0` nên gợi ý "thử chuyển sang 中文" KHÔNG hiện — người dùng
       * nhận kết quả sai một cách tự tin, không có đường thoát.
       *
       * `null` thì request không gửi `mode` và API chạy đúng đường auto hôm nay.
       * Toggle trở thành một lựa chọn ĐÈ LÊN phỏng đoán, không phải một mặc định
       * áp đặt — và đó cũng là lý do tham số `mode` phía API được thiết kế
       * nullable ngay từ đầu.
       */
      mode: null,
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'hanora.search-mode',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' && window.localStorage
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
)
