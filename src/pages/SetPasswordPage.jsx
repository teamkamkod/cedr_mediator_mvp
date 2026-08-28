import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function SetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const navigate = useNavigate()

  // Supabase processes the invite token from the URL hash automatically.
  // We wait for the session to be established before showing the form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setSessionReady(true)
    })
    // Also check if session already set (fast load)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) return setError(error.message)

    // Clear the invite flag and go to the app
    sessionStorage.removeItem('invite_flow')
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-cedr-light flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://www.cedr.com/hubfs/New_CEDR_2025/Images/CEDR_Logo%20Dark.svg"
            alt="CEDR"
            className="h-9 mx-auto mb-3"
          />
          <h1 className="text-cedr-navy font-semibold text-lg">Welcome to the Mediator Portal</h1>
          <p className="text-cedr-muted text-sm mt-1">
            Set a password to activate your account.
          </p>
        </div>

        <div className="card p-6">
          {!sessionReady ? (
            <div className="flex items-center justify-center py-8 gap-3">
              <div className="w-5 h-5 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-cedr-muted">Verifying your invitation…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cedr-text mb-1">
                  Choose a password
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="At least 8 characters"
                    required
                    autoFocus
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

              <div>
                <label className="block text-sm font-medium text-cedr-text mb-1">
                  Confirm password
                </label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="input"
                  placeholder="Same password again"
                  required
                />
              </div>

              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[8, 12, 16].map(len => (
                      <div
                        key={len}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= len ? 'bg-cedr-teal' : 'bg-cedr-border'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-cedr-muted">
                    {password.length < 8  ? 'Too short'  :
                     password.length < 12 ? 'Acceptable' :
                     password.length < 16 ? 'Good'       : 'Strong'}
                  </p>
                </div>
              )}

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !sessionReady}
                className="btn-primary w-full"
              >
                {loading ? 'Activating account…' : 'Set password & continue'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-cedr-muted text-xs mt-6">
          Need help?{' '}
          <a href="mailto:mediations@cedr.com" className="underline">
            mediations@cedr.com
          </a>
        </p>
      </div>
    </div>
  )
}
