import { createBrowserRouter } from 'react-router-dom'

import { RootLayout } from '../components/RootLayout'
import { HomePage } from '../pages/HomePage'
import { AboutPage } from '../pages/AboutPage'
import { FaqPage } from '../pages/FaqPage'
import { CookiesPage } from '../pages/legal/CookiesPage'
import { PrivacyPage } from '../pages/legal/PrivacyPage'
import { TermsPage } from '../pages/legal/TermsPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AdminPage } from '../pages/AdminPage'
import { ContactPage } from '../pages/ContactPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { EmailVerifiedPage } from '../pages/EmailVerifiedPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RootLayout isError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'cookies', element: <CookiesPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'email-verified', element: <EmailVerifiedPage /> },
      // Hidden entry (no nav link): admin dashboard
      { path: '__admin', element: <AdminPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
