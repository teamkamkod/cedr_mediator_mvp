import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { X, Sun, Mail, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { SLOT_STATUSES } from '../../lib/constants'
import { useCreateProvisionalBooking, useDeleteSlot } from '../../hooks/useAvailability'
import { useAuth } from '../../lib/auth'

const BOOKABLE_STATUSES = ['not_set', 'available']

export default function CRASlotPopover({ slot, date, period, mediatorId, onClose, readOnly = false }) {
  const [fullDay,       setFullDay]       = useState(false)
  const [sendEmail,     setSendEmail]     = useState(false)
  const [message,       setMessage]       = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { activeMediatorProfile, profile } = useAuth()
  const createBooking = useCreateProvisionalBooking()
  const deleteSlot    = useDeleteSlot()
  const ref           = useRef()

  const canBook      = BOOKABLE_STATUSES.includes(slot?.status || 'not_set')
  const isProvisional = slot?.status === 'provisionally_booked'
  const isConfirmed   = slot?.status === 'confirmed'
  const isReadOnly    = !canBook && !isProvisional
  const canDelete    = isProvisional && slot?.created_by === profile?.id

  // Past read-only view: show status + allow delete of own provisional bookings
  if (readOnly) {
    const meta = SLOT_STATUSES[slot?.status] || SLOT_STATUSES.not_set
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={onClose}>
        <div ref={ref} onClick={e => e.stopPropagation()}
          className="bg-white rounded-lg shadow-popover border border-cedr-border w-80 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-cedr-border">
            <div>
              <p className="text-sm font-semibold text-cedr-navy">{format(date, 'EEE, MMM d')}</p>
              <p className="text-xs text-cedr-muted capitalize">{period} · Past</p>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
              <X size={14} className="text-cedr-muted" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {slot?.status === 'provisionally_booked' ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 border border-purple-200 rounded">
                <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-purple-800">Provisional Booking</p>
                  <p className="text-xs text-purple-600">Past slot</p>
                </div>
              </div>
            ) : (
              <div className={clsx('inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium', meta.color)}>
                {meta.label}
              </div>
            )}
            {slot?.notes && <p className="text-xs text-cedr-muted italic">{slot.notes}</p>}
            <p className="text-xs text-cedr-muted/60">Past slots are read-only.</p>
          </div>
          <div className="flex gap-2 px-4 pb-4">
            {canDelete && (
              <button onClick={() => setConfirmDelete(true)}
                className="p-2 rounded text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                title="Cancel this booking">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">Close</button>
          </div>

          {/* Delete confirmation for past provisional */}
          {confirmDelete && (
            <div className="absolute inset-0 bg-white flex flex-col p-5 gap-4">
              <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                <Trash2 size={15} />
                Cancel this provisional booking?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1 text-xs">Back</button>
                <button onClick={handleDelete} disabled={deleteSlot.isPending}
                  className="flex-1 text-xs px-4 py-2 rounded font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                  {deleteSlot.isPending ? 'Cancelling…' : 'Cancel booking'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

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
      date:              format(date, 'yyyy-MM-dd'),
      period,
      fullDay,
      sendEmail,
      message:           sendEmail ? message : null,
      hubspotMediatorId: activeMediatorProfile?.hubspot_mediator_object_id,
    })
    onClose()
  }

  async function handleDelete() {
    await deleteSlot.mutateAsync({ slotId: slot.id, mediatorId })
    onClose()
  }

  const saving = createBooking.isPending || deleteSlot.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={onClose}>
      <div ref={ref} onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-popover border border-cedr-border w-80 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cedr-border">
          <div>
            <p className="text-sm font-semibold text-cedr-navy">{format(date, 'EEE, MMM d')}</p>
            <p className="text-xs text-cedr-muted capitalize">
              {fullDay && canBook ? 'Full day' : period}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        {/* Delete confirmation */}
        {confirmDelete ? (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-red-700">
              <Trash2 size={15} />
              Cancel this provisional booking?
            </div>
            <p className="text-xs text-cedr-muted leading-relaxed">
              The <strong>{period}</strong> slot on <strong>{format(date, 'EEE d MMM')}</strong> will be released back to Available.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1 text-xs">Back</button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 text-xs px-4 py-2 rounded font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                {saving ? 'Cancelling…' : 'Cancel booking'}
              </button>
            </div>
          </div>

        ) : (
          <div className="p-4 space-y-4">

            {/* Booking form */}
            {canBook && (
              <>
                {/* Explicit "Provisional Booking" label */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 border border-purple-200 rounded">
                  <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-purple-800">Provisional Booking</p>
                    <p className="text-xs text-purple-600">
                      {slot?.status === 'available'
                        ? 'This slot is currently Available — booking will mark it as Provisional'
                        : 'This slot has no availability set — booking will mark it as Provisional'}
                    </p>
                  </div>
                </div>

                {/* Full day toggle */}
                <label className={clsx(
                  'flex items-center justify-between p-3 rounded border cursor-pointer transition-all select-none',
                  fullDay ? 'border-cedr-navy bg-cedr-light' : 'border-cedr-border hover:border-cedr-navy/30'
                )}>
                  <div className="flex items-center gap-2">
                    <Sun size={14} className={fullDay ? 'text-cedr-navy' : 'text-cedr-muted'} />
                    <span className={clsx('text-sm font-medium', fullDay ? 'text-cedr-navy' : 'text-cedr-text')}>Full day</span>
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
                      placeholder="Add context for the mediator…"
                      rows={3} className="input text-xs resize-none" />
                  </div>
                )}

                {createBooking.isError && (
                  <p className="text-red-600 text-xs">{createBooking.error?.message}</p>
                )}
              </>
            )}

            {/* Read-only: ask_me / unavailable */}
            {isReadOnly && !isConfirmed && (
              <div className="text-center py-3 space-y-2">
                <div className={clsx('status-badge border mx-auto', SLOT_STATUSES[slot.status]?.color)}>
                  {SLOT_STATUSES[slot.status]?.label}
                </div>
                <p className="text-sm text-cedr-muted">
                  This slot cannot be provisionally booked.
                </p>
              </div>
            )}

            {/* Read-only: confirmed */}
            {isConfirmed && (
              <div className="space-y-2">
                <div className={clsx('status-badge border', SLOT_STATUSES.confirmed.color)}>
                  Confirmed
                </div>
                <p className="text-xs text-cedr-muted">This mediation is confirmed.</p>
              </div>
            )}

            {/* Provisional: show info + delete if own slot */}
            {isProvisional && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 border border-purple-200 rounded">
                  <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-purple-800">Provisional Booking</p>
                    <p className="text-xs text-purple-600">Awaiting mediator confirmation</p>
                  </div>
                </div>
                {slot.notes && <p className="text-xs text-cedr-muted italic">{slot.notes}</p>}
                {!canDelete && (
                  <p className="text-xs text-cedr-muted">
                    This booking was created by another team member.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!confirmDelete && (
          <div className="flex gap-2 px-4 pb-4">
            {/* Delete — only CRA's own provisional bookings */}
            {canDelete && (
              <button onClick={() => setConfirmDelete(true)}
                className="p-2 rounded text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                title="Cancel this booking">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className="btn-secondary flex-1 text-xs">
              {canBook ? 'Cancel' : 'Close'}
            </button>
            {canBook && (
              <button onClick={handleBook} disabled={saving}
                className="flex-1 text-xs px-4 py-2 rounded font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50">
                {saving ? 'Booking…' : fullDay ? 'Book full day' : 'Book slot'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
