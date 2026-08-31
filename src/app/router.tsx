import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { SearchPage } from '@/features/dictionary/pages/SearchPage'
import {
  AccountPage,
  DisplaySettingsPage,
  ForgotPasswordPage,
  GalleryPage,
  RegisterPage,
  ResetPasswordPage,
  ReviewHistoryPage,
  ReviewPage,
  ReviewSessionDetailPage,
  SentenceDetailPage,
  StatsPage,
  StreakPage,
  TopicLearnPage,
  TopicsPage,
  VocabularyPage,
  VoiceSettingsPage,
  WordDetailPage,
} from './lazy-pages'

/**
 * D8: KHÔNG có chế độ khách. Mọi màn nội dung nằm sau `ProtectedRoute`, kể cả
 * tìm kiếm và chi tiết từ.
 *
 * Bốn màn auth nằm ngoài cổng để chúng không tự chặn chính mình.
 *
 * `/stats` có route nhưng chưa có tab trong điều hướng — tab xuất hiện cùng
 * P17. Route tồn tại sớm để deep link không gãy.
 */
export const routes = [
  { path: '/login', Component: LoginPage },
  { path: '/register', Component: RegisterPage },
  { path: '/forgot-password', Component: ForgotPasswordPage },
  { path: '/reset-password', Component: ResetPasswordPage },

  {
    path: '/',
    Component: ProtectedRoute,
    children: [
      {
        path: '',
        Component: AppShell,
        children: [
          { index: true, element: <Navigate to="/search" replace /> },
          { path: 'search', Component: SearchPage },
          { path: 'words/:id', Component: WordDetailPage },
          /*
           * Câu nằm ở query string chứ không phải path param: nó không có id, và
           * một câu có thể chứa ký tự làm vỡ path. Khoá trùng đúng khoá cache
           * phía API, nên deep link vào đây vẫn chạy sau khi tải lại trang.
           */
          { path: 'sentence', Component: SentenceDetailPage },
          { path: 'vocabulary', Component: VocabularyPage },
          { path: 'review', Component: ReviewPage },
          /*
           * KHÔNG có tab trong điều hướng — lối vào là từ màn tổng kết phiên và
           * trang Thống kê, đúng tiền lệ của `/stats` khi mới thêm.
           */
          { path: 'review/history', Component: ReviewHistoryPage },
          { path: 'review/history/:id', Component: ReviewSessionDetailPage },
          /*
           * Chủ đề: KHÔNG có tab trong điều hướng ở v1 — lối vào là từ màn Kho
           * từ và empty state của màn Ôn tập, đúng tiền lệ `/stats` khi mới
           * thêm. Tab chỉ đáng thêm khi đã biết người dùng có dùng hay không.
           */
          { path: 'topics', Component: TopicsPage },
          { path: 'topics/:slug', Component: TopicLearnPage },
          { path: 'stats', Component: StatsPage },
          { path: 'streak', Component: StreakPage },
          { path: 'account', Component: AccountPage },
          { path: 'account/settings', Component: DisplaySettingsPage },
          { path: 'account/settings/voice', Component: VoiceSettingsPage },
          // Trang nội bộ kiểm tra thị giác — cố tình không có trong điều hướng.
          { path: '__gallery', Component: GalleryPage },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
