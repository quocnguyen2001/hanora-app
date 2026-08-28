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
  ReviewPage,
  StatsPage,
  VocabularyPage,
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
          { path: 'vocabulary', Component: VocabularyPage },
          { path: 'review', Component: ReviewPage },
          { path: 'stats', Component: StatsPage },
          { path: 'account', Component: AccountPage },
          { path: 'account/settings', Component: DisplaySettingsPage },
          // Trang nội bộ kiểm tra thị giác — cố tình không có trong điều hướng.
          { path: '__gallery', Component: GalleryPage },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
