import { useState } from 'react'
import { UserPlus, X, AlertCircle } from 'lucide-react'
import { useMediatorClerks, useAddClerk, useRemoveClerk } from '../../hooks/useProfile'
import { Avatar } from '../layout/AppLayout'

const ERROR_MESSAGES = {
  no_account:      'No portal account found for this email. Ask your admin to create a clerk account first.',
  inactive:        'This account has been deactivated. Contact your admin.',
  not_clerk:       'This user is not a clerk account.',
  already_assigned:'This clerk is already assigned to your account.',
}

export default function ClerkManager({ mediatorId }) {
  const [email, setEmail]   = useState('')
  const [error, setError]   = useState(null)
  const [success, setSuccess] = useState(null)

  const { data: assignments, isLoading } = useMediatorClerks(mediatorId)
  const addClerk    = useAddClerk()
  const removeClerk = useRemoveClerk()

  async function handleInvite(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      await addClerk.mutateAsync({ mediatorId, email })
      setEmail('')
      setSuccess(`Clerk added successfully.`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(ERROR_MESSAGES[err.message] || err.message)
    }
  }

  async function handleRemove(clerkId, clerkName) {
    if (!confirm(`Remove ${clerkName} from your account?`)) return
    await removeClerk.mutateAsync({ mediatorId, clerkId })
  }

  return (
    <section className="card p-6">
      <h2 className="text-base font-semibold text-cedr-navy mb-1">Clerk access</h2>
      <p className="text-sm text-cedr-muted mb-5">
        Clerks can view and update your calendar on your behalf.
      </p>

      {/* Current clerks */}
      {isLoading ? (
        <div className="h-12 flex items-center">
          <div className="w-4 h-4 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assignments?.length === 0 ? (
        <div className="text-sm text-cedr-muted bg-cedr-light rounded px-4 py-3 mb-5">
          No clerks assigned yet.
        </div>
      ) : (
        <ul className="space-y-2 mb-5">
          {assignments?.map(a => (
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
                onClick={() => handleRemove(a.clerk_id, a.clerk?.full_name || a.clerk?.email)}
                disabled={removeClerk.isPending}
                className="p-1.5 rounded text-cedr-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Remove clerk"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Invite form */}
      <div>
        <p className="text-sm font-medium text-cedr-text mb-2">Add a clerk by email</p>
        <form onSubmit={handleInvite} className="flex gap-2 max-w-sm">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input flex-1"
            placeholder="clerk@example.com"
            required
          />
          <button
            type="submit"
            disabled={addClerk.isPending}
            className="btn-primary flex items-center gap-1.5 shrink-0"
          >
            <UserPlus size={14} />
            {addClerk.isPending ? 'Adding…' : 'Add'}
          </button>
        </form>

        {error && (
          <div className="flex items-start gap-2 mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 max-w-sm">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <p className="mt-2 text-sm text-green-700">{success}</p>
        )}
      </div>
    </section>
  )
}
