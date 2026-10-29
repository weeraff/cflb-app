import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import { MVP_MODE } from './lib/featureFlags'

// Route-level code-splitting — each page only downloads when actually
// visited instead of all five bundling into one ~530KB chunk up front.
// Layout stays a normal import: it's the persistent shell around every
// route, not something to defer.
const HomePage = lazy(() => import('./pages/HomePage'))
const NewsPage = lazy(() => import('./pages/NewsPage'))
const PodcastPage = lazy(() => import('./pages/PodcastPage'))
const PredictionsPage = lazy(() => import('./pages/PredictionsPage'))
const YourTeamPage = lazy(() => import('./pages/YourTeamPage'))
const ReporterPage = lazy(() => import('./pages/ReporterPage'))
const SignInPage = lazy(() => import('./pages/SignInPage'))
const MvpLayout = lazy(() => import('./mvp/MvpLayout'))
const PicksPage = lazy(() => import('./mvp/PicksPage'))
const LeaderboardPage = lazy(() => import('./mvp/LeaderboardPage'))
const JoinLeaguePage = lazy(() => import('./mvp/JoinLeaguePage'))
const StatsPage = lazy(() => import('./mvp/StatsPage'))
const TermsPage = lazy(() => import('./mvp/TermsPage'))
const UnsubscribePage = lazy(() => import('./mvp/UnsubscribePage'))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            {MVP_MODE ? (
              <Route element={<MvpLayout />}>
                <Route index element={<PicksPage />} />
                {/* Push notifications link here, keep it landing on picks. */}
                <Route path="predictions" element={<PicksPage />} />
                <Route path="leaderboard" element={<LeaderboardPage />} />
                <Route path="join/:code" element={<JoinLeaguePage />} />
                <Route path="stats" element={<StatsPage />} />
                <Route path="terms" element={<TermsPage />} />
                <Route path="unsubscribe" element={<UnsubscribePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            ) : (
            <Route element={<Layout />}>
              {/* Predictions is the front door: it's what the app is for
                  now, so it's the first thing anyone lands on. The old
                  Home (live scores, table, upcoming games) lives at /table. */}
              <Route index element={<PredictionsPage />} />
              <Route path="table" element={<HomePage />} />
              {/* Kept as an alias: push notifications already scheduled and
                  sent reference this exact path, don't break those links. */}
              <Route path="predictions" element={<PredictionsPage />} />
              <Route path="your-team" element={<YourTeamPage />} />
              <Route path="podcast" element={<PodcastPage />} />
              <Route path="news" element={<NewsPage />} />
              {/* Not in the visible nav — trusted-allowlist admin route,
                  reporters navigate here directly by URL. */}
              <Route path="reporter" element={<ReporterPage />} />
              <Route path="sign-in" element={<SignInPage />} />
            </Route>
            )}
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
