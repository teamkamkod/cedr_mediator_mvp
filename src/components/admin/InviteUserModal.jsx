import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { useAdminInviteUser } from '../../hooks/useAdmin'
import { useMediators, useSaveAssignments } from '../../hooks/useAssignments'
import MediatorCheckboxList from './MediatorCheckboxList'

const ROLE_OPTIONS = [
  { value: 'mediator',    label: 'Mediator',    desc: 'Can manage their own availability calendar' },
  { value: 'clerk',       label: 'Clerk',       desc: 'Can manage calendars for assigned mediators' },
  { value: 'super_admin', label: 'Super Admin', desc: 'Full access to all users and calendars' },
]

const ERROR_MESSAGES = {
  email_exists:  'An account with this email already exists.',
  unauthorized:  'You are not authorised to perform this action.',
  invalid_role:  'Invalid role selected.',
}

export default function InviteUserModal({ onClose }) {
  const [step, setStep]           = useState('form')   // 'form' | 'assign' | 'done'
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [role,      setRole]      = useState('mediator')
  const [error,     setError]     = useState(null)
  const [newUserId, setNewUserId] = useState(null)
  const [selected,  setSelected]  = useState([])

  const invite          = useAdminInviteUser()
  const saveAssignments = useSaveAssignments()
  const { data: mediators } = useMediators()

  async function handleInvite(e) {
    e.preventDefault()
    setError(null)
    try {
      const result = await invite.mutateAsync({ firstName, lastName, email, role })
      setNewUserId(result.user_id)
      // For clerks, show assignment step; otherwise done
      if (role === 'clerk') setStep('assign')
      else setStep('done')
    } catch (err) {
      setError(ERROR_MESSAGES[err.message] || err.message)
    }
  }

  async function handleAssign() {
    if (selected.length > 0) {
      await saveAssignments.mutateAsync({
        clerkId: newUserId,
        newMediatorIds: selected,
        previousMediatorIds: [],
      })
    }
    setStep('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-popover border border-cedr-border w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cedr-border">
          <div>
            <h2 className="text-base font-semibold text-cedr-navy">
              {step === 'form'   ? 'Invite new user'   :
               step === 'assign' ? 'Assign to mediators' :
               'Invitation sent'}
            </h2>
            {step === 'assign' && (
              <p className="text-xs text-cedr-muted mt-0.5">Step 2 of 2</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={15} className="text-cedr-muted" />
          </button>
        </div>

        {/* Step: form */}
        {step === 'form' && (
          <form onSubmit={handleInvite} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-cedr-text mb-1">First name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="input text-sm" placeholder="Jane" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-cedr-text mb-1">Last name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  className="input text-sm" placeholder="Smith" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-cedr-text mb-1">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input text-sm" placeholder="jane.smith@example.com" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-cedr-text mb-2">Role</label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all ${
                      role === opt.value
                        ? 'border-cedr-navy bg-cedr-light'
                        : 'border-cedr-border hover:border-cedr-navy/30'
                    }`}>
                    <input type="radio" name="role" value={opt.value}
                      checked={role === opt.value} onChange={() => setRole(opt.value)}
                      className="mt-0.5 accent-cedr-navy" />
                    <div>
                      <p className="text-sm font-medium text-cedr-text">{opt.label}</p>
                      <p className="text-xs text-cedr-muted">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={invite.isPending} className="btn-primary flex-1">
                {invite.isPending
                  ? 'Sending…'
                  : role === 'clerk' ? 'Next →' : 'Send invitation'}
              </button>
            </div>
          </form>
        )}

        {/* Step: assign mediators (clerk only) */}
        {step === 'assign' && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-cedr-muted">
              Invitation sent to <strong>{email}</strong>.
              Now assign {firstName} to one or more mediators — you can change this later.
            </p>
            <MediatorCheckboxList
              mediators={mediators ?? []}
              selected={selected}
              onChange={setSelected}
            />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep('done')} className="btn-secondary flex-1 text-sm">
                Skip for now
              </button>
              <button
                onClick={handleAssign}
                disabled={saveAssignments.isPending}
                className="btn-primary flex-1 text-sm"
              >
                {saveAssignments.isPending
                  ? 'Saving…'
                  : `Assign${selected.length > 0 ? ` (${selected.length})` : ''} & finish`}
              </button>
            </div>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-2xl">✓</div>
            <p className="font-medium text-cedr-navy">All done</p>
            <p className="text-sm text-cedr-muted">
              {firstName} {lastName} will receive an email at <strong>{email}</strong> to set their password.
              {role === 'clerk' && selected.length > 0 && (
                <> They've been assigned to {selected.length} mediator{selected.length > 1 ? 's' : ''}.</>
              )}
            </p>
            <button onClick={onClose} className="btn-primary mt-2">Close</button>
          </div>
        )}
      </div>
    </div>
  )
}
