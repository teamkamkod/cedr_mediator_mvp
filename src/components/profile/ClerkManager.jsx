import { useState } from 'react'
import { UserPlus, ShieldOff, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useMediatorClerks, useInviteClerk, useRevokeClerk } from '../../hooks/useProfile'
import { Avatar } from '../layout/AppLayout'

const ERROR_MESSAGES = {
  email_exists:  'An account with this email already exists.',
  unauthorized:  'You are not authorised to perform this action.',
}

function getErrorMessage(msg) {
  return ERROR_MESSAGES[msg] || msg
}

export default function ClerkManager({ mediatorId }) {
  const [showForm, setShowForm]     = useState(false)
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [email, setEmail]           = useState('')
  const [confirmed, setConfirmed]   = useState(false)
  const [formError, setFormError]   = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const { data: assignments, isLoading } = useMediatorClerks(mediatorId)
  const invite = useInviteClerk()
  const revoke = useRevokeClerk()

  const active  = assignments?.filter(a => a.clerk?.is_active)  || []
  const revoked = assignments?.filter(a => !a.clerk?.is_active) || []

  async function handleInvite(e) {
    e.preventDefault()
    setFormError(null)
    if (!confirmed) return setFormError('Please confirm by checking the box below.')
    try {
      await invite.mutateAsync({ mediatorId, firstName, lastName, email })
      setFirstName(''); setLastName(''); setEmail('')
      setConfirmed(false); setShowForm(false)
      setSuccessMsg(`Invitation sent to ${email}.`)
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err) {
      setFormError(getErrorMessage(err.message))
    }
  }

  async function handleRevoke(clerkId, name) {
    if (!confirm(`Revoke access for ${name}? They will no longer be able to log in.`)) return
    await revoke.mutateAsync({ mediatorId, clerkId })
  }

  return (
    <section className="card p-6">
      <h2 className="text-base font-semibold text-cedr-navy mb-1">Clerk access</h2>
      <p className="text-sm text-cedr-muted mb-5">
        Clerks can view and update your calendar on your behalf.
      </p>

      {/* Active clerks */}
      {isLoading ? (
        <div className="h-10 flex items-center">
          <div className="w-4 h-4 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : active.length === 0 ? (
        <p className="text-sm text-cedr-muted bg-cedr-light rounded px-4 py-3 mb-4">
          No active clerks assigned.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {active.map(a => (
            <li key={a.clerk_id} className="flex items-center justify-between bg-cedr-light rounded px-3 py-2.5">
              <div className="flex items-center gap-3">
                <Avatar profile={a.clerk} size="sm" />
                <div>
                  <p className="text-sm font-medium text-cedr-text">
                    {a.clerk?.full_name || a.clerk?.email}
                  </p>
                  <p className="text-xs text-cedr-muted">{a.clerk?.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleRevoke(a.clerk_id, a.clerk?.full_name || a.clerk?.email)}
                disabled={revoke.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
              >
                <ShieldOff size={12} />
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Revoked clerks (collapsed) */}
      {revoked.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-cedr-muted mb-2">{revoked.length} revoked clerk{revoked.length > 1 ? 's' : ''}</p>
          <ul className="space-y-1">
            {revoked.map(a => (
              <li key={a.clerk_id} className="flex items-center gap-3 px-3 py-2 rounded opacity-50">
                <Avatar profile={a.clerk} size="sm" />
                <div>
                  <p className="text-sm line-through text-cedr-muted">{a.clerk?.full_name || a.clerk?.email}</p>
                  <p className="text-xs text-cedr-muted">{a.clerk?.email}</p>
                </div>
                <span className="ml-auto text-xs text-red-500 font-medium">Revoked</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success message */}
      {successMsg && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
          ✓ {successMsg}
        </p>
      )}

      {/* Add clerk toggle */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 btn-secondary text-sm"
        >
          <UserPlus size={14} />
          Add a clerk
        </button>
      ) : (
        <div className="border border-cedr-border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-cedr-navy">Invite a new clerk</p>
            <button onClick={() => { setShowForm(false); setFormError(null) }} className="text-cedr-muted hover:text-cedr-text text-xs">
              Cancel
            </button>
          </div>

          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-cedr-text mb-1">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="input text-sm"
                  placeholder="Jane"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-cedr-text mb-1">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="input text-sm"
                  placeholder="Smith"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-cedr-text mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input text-sm"
                placeholder="jane.smith@example.com"
                required
              />
            </div>

            {/* Confirmation checkbox */}
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded border border-amber-200 bg-amber-50">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-0.5 shrink-0 accent-cedr-navy"
              />
              <span className="text-xs text-amber-800 leading-relaxed">
                I understand this will create a portal account for this email address and grant them full access to manage my calendar availability.
              </span>
            </label>

            {formError && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={invite.isPending}
              className="btn-primary w-full text-sm"
            >
              {invite.isPending ? 'Sending invitation…' : 'Send invitation'}
            </button>
          </form>
        </div>
      )}
    </section>
  )
}
