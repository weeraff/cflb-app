import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import NewsPage from './pages/NewsPage'
import PodcastPage from './pages/PodcastPage'
import TablePage from './pages/TablePage'
import PredictionsPage from './pages/PredictionsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<NewsPage />} />
            <Route path="podcast" element={<PodcastPage />} />
            <Route path="table" element={<TablePage />} />
            <Route path="predictions" element={<PredictionsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
