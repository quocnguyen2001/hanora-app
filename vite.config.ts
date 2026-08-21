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
         * Precache shell + JS/CSS + font LATIN.
         *
         * KHÔNG precache font CJK: từ điển 120k mục bung ra gần như mọi codepoint
         * CJK nên không có subset nào thật sự dùng được, và file đủ dùng nặng vài
         * MB. Đưa nó vào precache nghĩa là lần cài đầu phải tải hết trước khi app
         * dùng được — không thể đi cùng mục tiêu Lighthouse ≥ 90 của P20 (M7).
         */
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        globIgnores: ['**/noto-sans-sc*'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Font CJK: tải lười, giữ lâu. `unicode-range` trong fonts.css lo
            // phần chỉ tải lát chữ cần dùng.
            urlPattern: /\/fonts\/noto-sans-sc.*\.woff2$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hanora-fonts-cjk',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
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
