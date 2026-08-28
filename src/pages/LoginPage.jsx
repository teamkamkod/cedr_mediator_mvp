import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://cedr-mediator-mvp.team-cd8.workers.dev'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  return mode === 'login'
    ? <LoginForm onForgot={() => setMode('forgot')} />
    : <ForgotForm onBack={() => setMode('login')} />
}

function LoginForm({ onForgot }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="min-h-screen bg-cedr-light flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="https://www.cedr.com/hubfs/New_CEDR_2025/Images/CEDR_Logo%20Dark.svg"
            alt="CEDR"
            className="h-9 mx-auto mb-3"
          />
          <h1 className="text-cedr-navy font-semibold text-lg">Mediator Portal</h1>
          <p className="text-cedr-muted text-sm mt-1">Sign in to manage your availability</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-cedr-text mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-cedr-text">Password</label>
                <button
                  type="button"
                  onClick={onForgot}
                  className="text-xs text-cedr-teal hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cedr-muted hover:text-cedr-text"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-cedr-muted text-xs mt-6">
          Access is managed by CEDR. Contact{' '}
          <a href="mailto:mediations@cedr.com" className="underline">
            mediations@cedr.com
          </a>{' '}
          if you need help.
        </p>
      </div>
    </div>
  )
}

function ForgotForm({ onBack }) {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/set-password`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="min-h-screen bg-cedr-light flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="https://www.cedr.com/hubfs/New_CEDR_2025/Images/CEDR_Logo%20Dark.svg"
            alt="CEDR"
            className="h-9 mx-auto mb-3"
          />
          <h1 className="text-cedr-navy font-semibold text-lg">Reset your password</h1>
          <p className="text-cedr-muted text-sm mt-1">
            We'll send you a link to set a new password.
          </p>
        </div>

        <div className="card p-6">
          {sent ? (
            <div className="text-center space-y-3 py-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check size={22} className="text-green-600" />
              </div>
              <p className="text-sm font-medium text-cedr-navy">Check your inbox</p>
              <p className="text-sm text-cedr-muted">
                We've sent a password reset link to <strong>{email}</strong>.
                It may take a minute to arrive.
              </p>
              <button
                onClick={onBack}
                className="text-sm text-cedr-teal hover:underline mt-2 block mx-auto"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cedr-text mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

              <button
                type="button"
                onClick={onBack}
                className="flex items-center justify-center gap-1.5 w-full text-sm text-cedr-muted hover:text-cedr-text transition-colors"
              >
                <ArrowLeft size={13} />
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
