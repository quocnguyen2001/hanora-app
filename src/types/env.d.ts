/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL của API. Để TRỐNG ở production: FE và API chung origin (D12) nên
   * đường dẫn tương đối là đúng. Ở dev cần URL tuyệt đối tới cổng 8080.
   */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
