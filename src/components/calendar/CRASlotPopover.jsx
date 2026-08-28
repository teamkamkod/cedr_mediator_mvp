import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { X, Sun, Mail } from 'lucide-react'
import { clsx } from 'clsx'
import { SLOT_STATUSES } from '../../lib/constants'
import { useCreateProvisionalBooking } from '../../hooks/useAvailability'
import { useAuth } from '../../lib/auth'

// Statuses a CRA can book over
const BOOKABLE_STATUSES = ['not_set', 'available']

export default function CRASlotPopover({ slot, date, period, mediatorId, onClose }) {
  const [fullDay,    setFullDay]    = useState(false)
  const [sendEmail,  setSendEmail]  = useState(false)
  const [message,    setMessage]    = useState('')
  const { activeMediatorProfile } = useAuth()

  const createBooking = useCreateProvisionalBooking()
  const ref           = useRef()

  const canBook = BOOKABLE_STATUSES.includes(slot?.status || 'not_set')
  const isBooked = ['provisionally_booked', 'confirmed'].includes(slot?.status)

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  async function handleBook() {
    await createBooking.mutateAsync({
      mediatorId,
      date:               format(date, 'yyyy-MM-dd'),
      period,
      fullDay,
      sendEmail,
      message:            sendEmail ? message : null,
      hubspotMediatorId:  activeMediatorProfile?.hubspot_mediator_object_id,
    })
    onClose()
  }

  const saving = createBooking.isPending
  const headerSub = fullDay ? 'Full day' : period

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={onClose}>
      <div
        ref={ref}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-popover border border-cedr-border w-80 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cedr-border">
          <div>
            <p className="text-sm font-semibold text-cedr-navy">{format(date, 'EEE, MMM d')}</p>
            <p className="text-xs text-cedr-muted capitalize">{headerSub}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Read-only: slot not bookable */}
          {!canBook && !isBooked && (
            <div className="text-center py-4">
              <div className={clsx('status-badge border mx-auto mb-2', SLOT_STATUSES[slot.status]?.color)}>
                {SLOT_STATUSES[slot.status]?.label}
              </div>
              <p className="text-sm text-cedr-muted">
                This slot cannot be provisionally booked.
              </p>
            </div>
          )}

          {/* Read-only: already booked */}
          {isBooked && (
            <div className="space-y-2">
              <div className={clsx('status-badge border', SLOT_STATUSES[slot.status]?.color)}>
                {SLOT_STATUSES[slot.status]?.label}
              </div>
              {slot.notes && <p className="text-xs text-cedr-muted italic">{slot.notes}</p>}
              <p className="text-xs text-cedr-muted">
                Awaiting mediator confirmation.
              </p>
            </div>
          )}

          {/* Booking form */}
          {canBook && (
            <>
              {/* Current status info */}
              {slot?.status === 'available' && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-status-available shrink-0" />
                  This slot is currently marked Available
                </div>
              )}

              {/* Full day toggle */}
              <label className={clsx(
                'flex items-center justify-between p-3 rounded border cursor-pointer transition-all select-none',
                fullDay ? 'border-cedr-navy bg-cedr-light' : 'border-cedr-border hover:border-cedr-navy/30'
              )}>
                <div className="flex items-center gap-2">
                  <Sun size={14} className={fullDay ? 'text-cedr-navy' : 'text-cedr-muted'} />
                  <span className={clsx('text-sm font-medium', fullDay ? 'text-cedr-navy' : 'text-cedr-text')}>
                    Full day
                  </span>
                  <span className="text-xs text-cedr-muted">— books AM & PM</span>
                </div>
                <div className={clsx('w-9 h-5 rounded-full transition-colors relative', fullDay ? 'bg-cedr-navy' : 'bg-cedr-border')}>
                  <div className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', fullDay ? 'translate-x-4' : 'translate-x-0.5')} />
                </div>
                <input type="checkbox" checked={fullDay} onChange={e => setFullDay(e.target.checked)} className="sr-only" />
              </label>

              {/* Send email toggle */}
              <label className={clsx(
                'flex items-center gap-3 p-3 rounded border cursor-pointer transition-all select-none',
                sendEmail ? 'border-cedr-teal bg-cedr-teal-light' : 'border-cedr-border hover:border-cedr-teal/40'
              )}>
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={e => setSendEmail(e.target.checked)}
                  className="accent-cedr-navy shrink-0"
                />
                <div className="flex items-center gap-2">
                  <Mail size={14} className={sendEmail ? 'text-cedr-teal' : 'text-cedr-muted'} />
                  <span className={clsx('text-sm font-medium', sendEmail ? 'text-cedr-navy' : 'text-cedr-text')}>
                    Send email request to mediator
                  </span>
                </div>
              </label>

              {/* Message field — shown when email is checked */}
              {sendEmail && (
                <div>
                  <p className="text-xs font-medium text-cedr-muted mb-1 uppercase tracking-wide">
                    Message <span className="opacity-60">(optional)</span>
                  </p>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Add context for the mediator…"
                    rows={3}
                    className="input text-xs resize-none"
                  />
                </div>
              )}

              {createBooking.isError && (
                <p className="text-red-600 text-xs">{createBooking.error?.message}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {canBook && (
          <div className="flex gap-2 px-4 pb-4">
            <button onClick={onClose} className="btn-secondary flex-1 text-xs">Cancel</button>
            <button
              onClick={handleBook}
              disabled={saving}
              className="btn-primary flex-1 text-xs bg-purple-600 hover:bg-purple-700"
            >
              {saving ? 'Booking…' : fullDay ? 'Book full day' : 'Book slot'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
