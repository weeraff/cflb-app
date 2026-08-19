import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'

// Route-level code-splitting — each page only downloads when actually
// visited instead of all five bundling into one ~530KB chunk up front.
// Layout stays a normal import: it's the persistent shell around every
// route, not something to defer.
const HomePage = lazy(() => import('./pages/HomePage'))
const NewsPage = lazy(() => import('./pages/NewsPage'))
const PodcastPage = lazy(() => import('./pages/PodcastPage'))
const PredictionsPage = lazy(() => import('./pages/PredictionsPage'))
const ReporterPage = lazy(() => import('./pages/ReporterPage'))
const SignInPage = lazy(() => import('./pages/SignInPage'))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              {/* Kept as an alias: the old Table nav item lived here before
                  Home absorbed it, don't break anything that bookmarked it. */}
              <Route path="table" element={<HomePage />} />
              {/* Kept as an alias: push notifications already scheduled and
                  sent reference this exact path, don't break those links. */}
              <Route path="predictions" element={<PredictionsPage />} />
              <Route path="podcast" element={<PodcastPage />} />
              <Route path="news" element={<NewsPage />} />
              {/* Not in the visible nav — trusted-allowlist admin route,
                  reporters navigate here directly by URL. */}
              <Route path="reporter" element={<ReporterPage />} />
              <Route path="sign-in" element={<SignInPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
