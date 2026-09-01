/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Tiền tố bucket cache chứa DỮ LIỆU CÁ NHÂN.
 *
 * `lib/session.ts` xóa mọi bucket khi đăng xuất, nhưng tiền tố này tồn tại để
 * ranh giới đó đọc được từ cấu hình: bất kỳ ai thêm một route API mới phải tự
 * hỏi nó thuộc bucket nào. Cache Storage key theo URL, KHÔNG theo tài khoản —
 * trên máy dùng chung, quên tách bucket nghĩa là tài khoản B đọc được kho từ
 * của tài khoản A khi offline (red team C2).
 */
const PRIVATE_CACHE = 'hanora-private'
const DICTIONARY_CACHE = 'hanora-dictionary'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'hanora — Học từ vựng tiếng Trung',
        short_name: 'hanora',
        description: 'Tra cứu, lưu và ôn tập từ vựng tiếng Trung với âm Hán-Việt.',
        lang: 'vi',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#FF6F91',
        background_color: '#FFFCFC',
        start_url: '/search',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        /*
         * Precache shell + JS/CSS + font Inter.
         *
         * `woff2` PHẢI có trong danh sách này. Thiếu nó thì không font nào lọt
         * vào precache, và lần mở offline đầu tiên rơi về font hệ thống — đúng
         * lỗi mà bản trước mắc suốt: comment nói "font LATIN" nhưng `globPatterns`
         * không hề khớp `woff2` nào.
         *
         * KHÔNG có font CJK để precache nữa. Google cắt Noto Sans SC thành 202
         * lát (~2,26 MB) nên không tồn tại một file subset dùng được — từ điển
         * 120k mục bung ra gần như mọi codepoint CJK. Chữ Hán giờ dùng font hệ
         * thống qua `--font-hanzi`; xem `src/styles/fonts.css`.
         */
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        /*
         * Lora là lựa chọn serif ở màn Hiển thị & chữ, phần lớn người dùng không
         * bật. Precache nó là bắt mọi người tải 45,6 KB cho một tùy chọn — nó
         * được lấy lười đúng lúc người dùng chọn, rồi nằm lại trong cache asset
         * thường của Workbox.
         */
        globIgnores: ['**/lora-*'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            /*
             * Lora: tải lười khi người dùng chọn serif, rồi giữ lâu. File có
             * `unicode-range` riêng cho latin và vietnamese nên chỉ lát thật sự
             * cần mới được lấy.
             *
             * Rule này thay chỗ rule font CJK cũ. Rule đó trỏ tới
             * `noto-sans-sc*` — thứ chưa bao giờ tồn tại trên đĩa và giờ đã bỏ
             * hẳn khỏi `fonts.css`.
             */
            urlPattern: /\/fonts\/lora-.*\.woff2$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hanora-fonts-optional',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            /*
             * Chi tiết từ: bất biến và KHÔNG chứa trường theo user (P6 đã gỡ
             * `saved`/`user_word_id` chính vì bucket này sống 30 ngày và không
             * bị xóa khi đăng xuất).
             */
            urlPattern: /\/api\/dictionary\/words\/\d+$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: `${DICTIONARY_CACHE}-words`,
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            /*
             * Hình học nét cho bảng tập viết.
             *
             * `CacheFirst`, KHÔNG `StaleWhileRevalidate` như chi tiết từ: API
             * đặt `immutable` một năm vì dữ liệu này tất định và không bao giờ
             * đổi. Chi tiết từ thì khác — nó còn được làm giàu thêm — nên ở đó
             * revalidate là đúng.
             *
             * Bucket thuộc nhóm DICTIONARY, không phải PRIVATE: không trường
             * nào theo user, nên nó KHÔNG nằm trong trình tự xóa của
             * `clearSession()`.
             *
             * Hệ quả có chủ đích: chữ đã xem một lần thì tập viết được khi
             * ngoại tuyến. Chữ chưa xem thì không, và sheet nói thẳng điều đó.
             */
            urlPattern: /\/api\/dictionary\/characters\/.+\/strokes$/,
            handler: 'CacheFirst',
            options: {
              cacheName: `${DICTIONARY_CACHE}-strokes`,
              // 200 chữ là vài trăm KB — thoải mái cho một người học, và đủ nhỏ
              // để không nuốt hạn mức lưu trữ của trình duyệt.
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /\/api\/dictionary\/search/,
            handler: 'NetworkFirst',
            options: {
              cacheName: `${DICTIONARY_CACHE}-search`,
              networkTimeoutSeconds: 3,
              /*
               * 200 chứ không phải 100: key là URL đầy đủ, mà `mode` nằm trong
               * query string nên một truy vấn tra ở cả hai mode chiếm hai slot.
               * Giữ nguyên 100 là âm thầm giảm một nửa độ phủ đọc ngoại tuyến.
               */
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            /*
             * BẮT BUỘC có dòng này.
             *
             * Thiếu nó thì khi offline app không xác định được người dùng, và
             * màn Tài khoản trống trơn dù phiên vẫn hợp lệ.
             */
            urlPattern: /\/api\/auth\/me$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: `${PRIVATE_CACHE}-me`,
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Dữ liệu cá nhân — bucket RIÊNG, bị xóa trong trình tự đăng xuất.
            urlPattern: /\/api\/vocabulary(\/ids)?(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: `${PRIVATE_CACHE}-vocabulary`,
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
          /*
           * KHÔNG có mục nào cho POST/DELETE, và đó là chủ đích (D4).
           *
           * Offline = chỉ ĐỌC. Không có hàng đợi mutation, không sync/merge ở
           * MVP. Thao tác ghi khi offline báo lỗi rõ ràng thay vì giả vờ thành
           * công rồi âm thầm mất.
           */

          /*
           * KHÔNG có mục nào cho `/api/reviews/*` — cũng là chủ đích, và câu
           * hỏi "route API mới thuộc bucket nào" ở đầu file đã được trả lời:
           * KHÔNG bucket nào.
           *
           * Lịch sử ôn tập là số liệu đúng-tại-thời-điểm. Phục vụ một bản cache
           * của nó khi offline nghĩa là hiện điểm và số lần sai CŨ mà không nói
           * cho người dùng biết — tệ hơn hẳn so với nói thẳng "cần kết nối".
           * Kho từ thì khác: một mục từ đã lưu vẫn đúng dù cũ mấy ngày.
           *
           * Hệ quả có chủ đích: hai màn `/review/history` hiện trạng thái ngoại
           * tuyến khi mất mạng, thay vì số liệu cũ.
           */

          /*
           * KHÔNG có mục nào cho `/api/topics/*` — trả lời tường minh cho câu
           * hỏi ở đầu file, chứ không phải bỏ sót.
           *
           * `/topics` và `/topics/skips` là `private, no-store`: chúng mang
           * tiến độ và lựa chọn theo user, đúng loại dữ liệu tuyệt đối không
           * được nằm trong cache dùng chung của thiết bị.
           *
           * `/topics/{slug}/words` KHÔNG mang dữ liệu theo user và cache được —
           * nhưng nó đã có `max-age=300, stale-while-revalidate` ở tầng HTTP.
           * Thêm một tầng SW nữa chỉ kéo dài đúng cái lệch mà API vừa cố ý rút
           * xuống 5 phút: sau khi bộ từ được mở rộng, thẻ chủ đề (no-store) sẽ
           * báo còn từ mới trong khi màn học đọc bản cache cũ và báo đã học hết.
           *
           * Hệ quả có chủ đích: học từ mới CẦN kết nối — cùng điều mà màn Ôn
           * tập đã nói thẳng, và vì cùng lý do (thao tác chính ở đây là GHI).
           */
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  // Alias `@/` đọc thẳng từ tsconfig.app.json — một nguồn duy nhất cho cả
  // TypeScript lẫn bundler.
  resolve: { tsconfigPaths: true },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Vitest nạp `.env` qua đúng pipeline env của Vite, nên nếu không chốt ở
    // đây thì suite sẽ xanh trên CI (không có .env) và đỏ trên máy dev (có
    // .env). Chuỗi rỗng = hình dạng production: FE và API chung origin (D12).
    env: { VITE_API_URL: '' },
  },
})
