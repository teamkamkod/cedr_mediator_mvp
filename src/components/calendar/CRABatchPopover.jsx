import { useState, useRef, useEffect } from 'react'
import { X, Mail } from 'lucide-react'
import { clsx } from 'clsx'
import { useBatchCreateProvisionalBooking } from '../../hooks/useAvailability'
import { useAuth } from '../../lib/auth'
import { useCase } from '../../lib/CaseContext'
import { format, parseISO } from 'date-fns'
import CaseDropdown from '../case/CaseDropdown'

export default function CRABatchPopover({ selectedSlots, mediatorId, onClose, onDone, mediatorOverride = null }) {
  const [sendEmail, setSendEmail] = useState(false)
  const [message,   setMessage]   = useState('')
  const { activeMediatorProfile } = useAuth()
  const { selectedCase }          = useCase()
  const [localCase, setLocalCase] = useState(selectedCase) // may be pre-filled from CRM context
  const effectiveProfile = mediatorOverride || activeMediatorProfile
  const createBatch = useBatchCreateProvisionalBooking()
  const ref         = useRef()

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  const sorted = [...selectedSlots].sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.period.localeCompare(b.period))
  const count  = sorted.length
  const canBook = !!localCase

  function slotLabel(s) {
    const d = format(parseISO(s.dateStr), 'EEE d MMM')
    const p = s.period === 'morning' ? 'AM' : 'PM'
    return `${d} ${p}`
  }

  async function handleBook() {
    await createBatch.mutateAsync({
      mediatorId,
      slots:             sorted.map(s => ({ dateStr: s.dateStr, period: s.period })),
      sendEmail,
      message:           sendEmail ? message : null,
      hubspotMediatorId: effectiveProfile?.hubspot_mediator_object_id,
      caseData:          localCase,
    })
    onDone({ mediatorName: effectiveProfile?.full_name, slots: sorted })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-black/20" onClick={onClose}>
      <div ref={ref} onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-popover border border-cedr-border w-full max-w-sm mb-4 overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-cedr-border">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <p className="text-sm font-semibold text-purple-800">Provisional Booking</p>
            </div>
            <p className="text-xs text-cedr-muted mt-0.5">{count} slot{count > 1 ? 's' : ''} selected</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Case selection — mandatory */}
          <CaseDropdown onChange={setLocalCase} />

          {/* Slot summary */}
          <div className="bg-purple-50 border border-purple-200 rounded px-3 py-2.5 space-y-1 max-h-28 overflow-y-auto">
            {sorted.map(s => (
              <p key={`${s.dateStr}-${s.period}`} className="text-xs text-purple-700 font-medium">
                {slotLabel(s)}
              </p>
            ))}
          </div>

          {/* Send email toggle */}
          <label className={clsx(
            'flex items-center gap-3 p-3 rounded border cursor-pointer transition-all select-none',
            sendEmail ? 'border-cedr-teal bg-cedr-teal-light' : 'border-cedr-border hover:border-cedr-teal/40'
          )}>
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
              className="accent-cedr-navy shrink-0" />
            <div className="flex items-center gap-2">
              <Mail size={14} className={sendEmail ? 'text-cedr-teal' : 'text-cedr-muted'} />
              <span className={clsx('text-sm font-medium', sendEmail ? 'text-cedr-navy' : 'text-cedr-text')}>
                Send email to mediator
              </span>
            </div>
          </label>

          {sendEmail && (
            <div>
              <p className="text-xs font-medium text-cedr-muted mb-1 uppercase tracking-wide">
                Message <span className="opacity-60">(optional)</span>
              </p>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Context for the mediator…"
                rows={3} className="input text-xs resize-none" />
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={handleBook} disabled={createBatch.isPending || !canBook}
            className="flex-1 text-sm px-4 py-2 rounded font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50">
            {createBatch.isPending ? 'Booking…' : `Book ${count} slot${count > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
