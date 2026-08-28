import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import LoginPage from './pages/LoginPage'
import CalendarPage from './pages/CalendarPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import MediatorSelectPage from './pages/MediatorSelectPage'
import AppLayout from './components/layout/AppLayout'

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, loading, isSuperAdmin } = useAuth()
  if (loading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (adminOnly && !isSuperAdmin) return <Navigate to="/" replace />
  return children
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-cedr-light flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <img
          src="https://www.cedr.com/hubfs/New_CEDR_2025/Images/CEDR_Logo%20Dark.svg"
          alt="CEDR"
          className="h-8 opacity-60"
        />
        <div className="w-6 h-6 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<CalendarPage />} />
          <Route path="select-mediator" element={<MediatorSelectPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin" element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
