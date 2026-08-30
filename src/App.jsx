import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import { CalendarProvider } from './lib/CalendarContext'
import LoginPage          from './pages/LoginPage'
import SetPasswordPage    from './pages/SetPasswordPage'
import CalendarPage       from './pages/CalendarPage'
import ProfilePage        from './pages/ProfilePage'
import AdminPage          from './pages/AdminPage'
import MediatorSelectPage from './pages/MediatorSelectPage'
import AppLayout          from './components/layout/AppLayout'

function AuthCallbackHandler() {
  const navigate = useNavigate()
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace('#', ''))
    const type = hash.get('type')
    if (type === 'invite' || type === 'recovery') {
      sessionStorage.setItem('invite_flow', '1')
      navigate('/set-password', { replace: true })
    }
  }, [])
  return null
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, loading, isAdmin, isClerk,
          needsMediatorSelect } = useAuth()

  if (loading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  if (isClerk && needsMediatorSelect) return <Navigate to="/select-mediator" replace />
  return children
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-cedr-light flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <img
          src="https://www.cedr.com/hubfs/New_CEDR_2025/Images/CEDR_Logo%20Dark.svg"
          alt="CEDR" className="h-8 opacity-60"
        />
        <div className="w-6 h-6 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CalendarProvider>
        <AuthCallbackHandler />
        <Routes>
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/set-password"    element={<SetPasswordPage />} />
        <Route path="/select-mediator" element={<MediatorSelectPage />} />

        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index          element={<CalendarPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin"   element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CalendarProvider>
    </BrowserRouter>
  )
}
