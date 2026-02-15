import { createBrowserRouter } from 'react-router-dom'

import { RootLayout } from '../components/RootLayout'
import { HomePage } from '../pages/HomePage'
import { AboutPage } from '../pages/AboutPage'
import { FaqPage } from '../pages/FaqPage'
import { ShopPage } from '../pages/ShopPage'
import { SignInPage } from '../pages/SignInPage'
import { CookiesPage } from '../pages/legal/CookiesPage'
import { PrivacyPage } from '../pages/legal/PrivacyPage'
import { TermsPage } from '../pages/legal/TermsPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RootLayout isError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'signin', element: <SignInPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'cookies', element: <CookiesPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
