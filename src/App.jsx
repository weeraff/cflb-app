import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import NewsPage from './pages/NewsPage'
import PodcastPage from './pages/PodcastPage'
import PredictionsPage from './pages/PredictionsPage'
import ReporterPage from './pages/ReporterPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
