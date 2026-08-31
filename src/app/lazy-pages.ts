import { lazy } from 'react'

/**
 * Màn tải LƯỜI, tách khỏi `router.tsx`.
 *
 * Để chung với `routes`/`router` sẽ vi phạm `react-refresh/only-export-components`:
 * một file vừa export component vừa export giá trị thường thì fast refresh
 * không hoạt động đúng.
 *
 * Chỉ `LoginPage` và `SearchPage` nằm trong bundle chính — hai màn đầu tiên
 * người dùng thấy. Không tách gì cả thì mọi người tải cả màn Thống kê với hai
 * biểu đồ SVG và cả bảng vẽ chữ Hán ngay lần mở app đầu tiên, dù chưa chắc bao
 * giờ dùng tới. Đo được: bundle chính giảm từ 499 KB xuống 245 KB.
 */
export const RegisterPage = lazy(() =>
  import('@/features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)

export const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/pages/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
)

export const ResetPasswordPage = lazy(() =>
  import('@/features/auth/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)

export const AccountPage = lazy(() =>
  import('@/features/auth/pages/AccountPage').then((m) => ({ default: m.AccountPage })),
)

export const WordDetailPage = lazy(() =>
  import('@/features/dictionary/pages/WordDetailPage').then((m) => ({ default: m.WordDetailPage })),
)

export const SentenceDetailPage = lazy(() =>
  import('@/features/dictionary/pages/SentenceDetailPage').then((m) => ({
    default: m.SentenceDetailPage,
  })),
)

export const VocabularyPage = lazy(() =>
  import('@/features/vocabulary/pages/VocabularyPage').then((m) => ({ default: m.VocabularyPage })),
)

export const ReviewPage = lazy(() =>
  import('@/features/review/pages/ReviewPage').then((m) => ({ default: m.ReviewPage })),
)

export const ReviewHistoryPage = lazy(() =>
  import('@/features/review/pages/ReviewHistoryPage').then((m) => ({
    default: m.ReviewHistoryPage,
  })),
)

export const ReviewSessionDetailPage = lazy(() =>
  import('@/features/review/pages/ReviewSessionDetailPage').then((m) => ({
    default: m.ReviewSessionDetailPage,
  })),
)

export const StatsPage = lazy(() =>
  import('@/features/stats/pages/StatsPage').then((m) => ({ default: m.StatsPage })),
)

export const DisplaySettingsPage = lazy(() =>
  import('@/features/settings/pages/DisplaySettingsPage').then((m) => ({
    default: m.DisplaySettingsPage,
  })),
)

export const VoiceSettingsPage = lazy(() =>
  import('@/features/settings/pages/VoiceSettingsPage').then((m) => ({
    default: m.VoiceSettingsPage,
  })),
)

export const GalleryPage = lazy(() =>
  import('@/features/gallery/pages/GalleryPage').then((m) => ({ default: m.GalleryPage })),
)

export const TopicsPage = lazy(() =>
  import('@/features/topics/pages/TopicsPage').then((m) => ({ default: m.TopicsPage })),
)

export const TopicLearnPage = lazy(() =>
  import('@/features/topics/pages/TopicLearnPage').then((m) => ({ default: m.TopicLearnPage })),
)

export const StreakPage = lazy(() =>
  import('@/features/streak/pages/StreakPage').then((m) => ({ default: m.StreakPage })),
)
