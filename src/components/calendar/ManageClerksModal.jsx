import { useState, useEffect } from 'react'
import { X, Trash2, UserPlus, Loader2, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ManageClerksModal({ mediatorId, mediatorName, onClose }) {
  const [assignments, setAssignments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [removing,    setRemoving]    = useState(null)
  const [step,        setStep]        = useState('list') // 'list' | 'invite'
  const [form,        setForm]        = useState({ firstName: '', lastName: '', email: '' })
  const [inviting,    setInviting]    = useState(false)
  const [error,       setError]       = useState(null)
  const [success,     setSuccess]     = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('mediator_clerk_assignments')
      .select('id, clerk:users!clerk_id(id, full_name, email)')
      .eq('mediator_id', mediatorId)
    setAssignments(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [mediatorId])

  async function handleRevoke(assignmentId) {
    setRemoving(assignmentId)
    await supabase.from('mediator_clerk_assignments').delete().eq('id', assignmentId)
    await load()
    setRemoving(null)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setInviting(true)
    setError(null)
    try {
      // Create clerk account
      const { data, error: fnErr } = await supabase.functions.invoke('admin-invite-user', {
        body: {
          email:     form.email,
          firstName: form.firstName,
          lastName:  form.lastName,
          role:      'clerk',
        },
      })
      if (fnErr || data?.error) throw new Error(fnErr?.message || data?.error || 'Failed to invite clerk')

      // Auto-assign to this mediator
      const clerkId = data?.user?.id || data?.id
      if (clerkId) {
        await supabase.from('mediator_clerk_assignments').insert({
          mediator_id: mediatorId,
          clerk_id:    clerkId,
        })
      }

      setSuccess(`${form.firstName} ${form.lastName} invited and assigned.`)
      setForm({ firstName: '', lastName: '', email: '' })
      await load()
      setStep('list')
    } catch (err) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-lg border border-cedr-border w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cedr-border">
          <div>
            <p className="text-sm font-semibold text-cedr-navy">Manage Clerks</p>
            <p className="text-xs text-cedr-muted">{mediatorName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 mx-5 mt-4 px-3 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            <Check size={14} className="shrink-0" />{success}
          </div>
        )}

        {/* ── LIST ── */}
        {step === 'list' && (
          <>
            <div className="px-5 py-4 space-y-2 max-h-60 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={18} className="animate-spin text-cedr-muted" />
                </div>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-cedr-muted text-center py-4">No clerks assigned yet.</p>
              ) : assignments.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 bg-cedr-light rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cedr-navy truncate">{a.clerk?.full_name}</p>
                    <p className="text-xs text-cedr-muted truncate">{a.clerk?.email}</p>
                  </div>
                  <button onClick={() => handleRevoke(a.id)} disabled={removing === a.id}
                    className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                    {removing === a.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={onClose} className="btn-secondary flex-1 text-sm">Close</button>
              <button onClick={() => { setStep('invite'); setSuccess(null) }}
                className="flex items-center gap-1.5 flex-1 justify-center text-sm px-4 py-2 rounded font-medium bg-cedr-navy text-white hover:bg-cedr-navy/90 transition-colors">
                <UserPlus size={14} />Invite clerk
              </button>
            </div>
          </>
        )}

        {/* ── INVITE FORM ── */}
        {step === 'invite' && (
          <form onSubmit={handleInvite} className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-cedr-muted uppercase tracking-wide">First name</label>
                <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="input text-sm" placeholder="Jane" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-cedr-muted uppercase tracking-wide">Last name</label>
                <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="input text-sm" placeholder="Smith" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-cedr-muted uppercase tracking-wide">Email</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input text-sm" placeholder="jane.smith@cedr.com" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setStep('list')} className="btn-secondary flex-1 text-sm">Back</button>
              <button type="submit" disabled={inviting}
                className="flex-1 text-sm px-4 py-2 rounded font-medium bg-cedr-navy text-white hover:bg-cedr-navy/90 transition-colors disabled:opacity-50">
                {inviting ? 'Inviting…' : 'Invite & assign'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
