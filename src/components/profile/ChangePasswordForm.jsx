import { useState } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { useChangePassword } from '../../hooks/useProfile'

export default function ChangePasswordForm() {
  const [newPwd, setNewPwd]       = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [saved, setSaved]         = useState(false)
  const [validationError, setValidationError] = useState(null)

  const changePassword = useChangePassword()

  async function handleSubmit(e) {
    e.preventDefault()
    setValidationError(null)

    if (newPwd.length < 8) {
      return setValidationError('Password must be at least 8 characters.')
    }
    if (newPwd !== confirmPwd) {
      return setValidationError('Passwords do not match.')
    }

    await changePassword.mutateAsync({ newPassword: newPwd })
    setNewPwd('')
    setConfirmPwd('')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const error = validationError || (changePassword.isError ? changePassword.error?.message : null)

  return (
    <section className="card p-6">
      <h2 className="text-base font-semibold text-cedr-navy mb-1">Change password</h2>
      <p className="text-sm text-cedr-muted mb-5">
        Choose a strong password of at least 8 characters.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div>
          <label className="block text-sm font-medium text-cedr-text mb-1">New password</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
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

        <div>
          <label className="block text-sm font-medium text-cedr-text mb-1">Confirm password</label>
          <input
            type={showPwd ? 'text' : 'password'}
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={changePassword.isPending} className="btn-primary">
            {changePassword.isPending ? 'Updating…' : 'Update password'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-700">
              <Check size={14} /> Password updated
            </span>
          )}
        </div>
      </form>
    </section>
  )
}
