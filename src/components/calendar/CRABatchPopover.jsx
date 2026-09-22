import { useState, useRef, useEffect } from 'react'
import { X, Mail, AlertTriangle, Pencil } from 'lucide-react'
import { clsx } from 'clsx'
import { useBatchCreateProvisionalBooking, useBatchPencilSlots } from '../../hooks/useAvailability'
import { useAuth } from '../../lib/auth'
import { useCase } from '../../lib/CaseContext'
import { format, parseISO } from 'date-fns'
import CaseDropdown from '../case/CaseDropdown'

export default function CRABatchPopover({ selectedSlots, mediatorId, onClose, onDone, mediatorOverride = null }) {
  const [bookingType, setBookingType] = useState('pencilled')   // 'pencilled' | 'provisionally_booked'
  const [sendEmail,   setSendEmail]   = useState(false)
  const [message,     setMessage]     = useState('')
  const [conflict,    setConflict]    = useState(false)
  const { activeMediatorProfile }     = useAuth()
  const { selectedCase }              = useCase()
  const [localCase,   setLocalCase]   = useState(selectedCase)
  const effectiveProfile = mediatorOverride || activeMediatorProfile
  const createBatch  = useBatchCreateProvisionalBooking()
  const pencilBatch  = useBatchPencilSlots()
  const ref          = useRef()

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  const sorted = [...selectedSlots].sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.period.localeCompare(b.period))
  const count   = sorted.length
  const canBook = !!localCase
  const isPending = createBatch.isPending || pencilBatch.isPending

  function slotLabel(s) {
    return `${format(parseISO(s.dateStr), 'EEE d MMM')} ${s.period === 'morning' ? 'AM' : 'PM'}`
  }

  async function handleBook() {
    setConflict(false)
    try {
      if (bookingType === 'pencilled') {
        await pencilBatch.mutateAsync({
          mediatorId,
          slots:             sorted.map(s => ({ dateStr: s.dateStr, period: s.period })),
          hubspotMediatorId: effectiveProfile?.hubspot_mediator_object_id,
          caseData:          localCase,
        })
      } else {
        await createBatch.mutateAsync({
          mediatorId,
          slots:             sorted.map(s => ({ dateStr: s.dateStr, period: s.period })),
          sendEmail,
          message:           sendEmail ? message : null,
          hubspotMediatorId: effectiveProfile?.hubspot_mediator_object_id,
          caseData:          localCase,
        })
      }
      onDone({ mediatorName: effectiveProfile?.full_name, slots: sorted })
    } catch (err) {
      if (err?.message === 'CASE_CONFLICT') setConflict(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-black/20" onClick={onClose}>
      <div ref={ref} onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-popover border border-cedr-border w-full max-w-2xl mb-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cedr-border">
          <div>
            <p className="text-sm font-semibold text-cedr-navy">Book slots</p>
            <p className="text-xs text-cedr-muted mt-0.5">{count} slot{count > 1 ? 's' : ''} selected</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Booking type selector */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-cedr-muted uppercase tracking-wide">Booking type</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setBookingType('pencilled')}
                className={clsx(
                  'flex items-center justify-center gap-2 px-4 py-3 rounded border-2 transition-all',
                  bookingType === 'pencilled'
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : 'border-cedr-border text-cedr-muted hover:border-amber-300'
                )}>
                <Pencil size={14} />
                <span className="text-sm font-semibold">Pencil</span>
              </button>
              <button onClick={() => setBookingType('provisionally_booked')}
                className={clsx(
                  'flex items-center justify-center gap-2 px-4 py-3 rounded border-2 transition-all',
                  bookingType === 'provisionally_booked'
                    ? 'border-purple-400 bg-purple-50 text-purple-800'
                    : 'border-cedr-border text-cedr-muted hover:border-purple-300'
                )}>
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-sm font-semibold">Provisional Booking</span>
              </button>
            </div>
          </div>

          {/* Case selection */}
          <CaseDropdown onChange={setLocalCase} />

          {/* Slot summary */}
          <div className={clsx('border rounded px-3 py-2.5 space-y-1 max-h-28 overflow-y-auto',
            bookingType === 'pencilled' ? 'bg-amber-50 border-amber-200' : 'bg-purple-50 border-purple-200'
          )}>
            {sorted.map(s => (
              <p key={`${s.dateStr}-${s.period}`}
                className={clsx('text-xs font-medium',
                  bookingType === 'pencilled' ? 'text-amber-700' : 'text-purple-700'
                )}>
                {slotLabel(s)}
              </p>
            ))}
          </div>

          {/* Notify mediator — only for Provisional Booking */}
          {bookingType === 'provisionally_booked' && (
            <>
              <label className={clsx(
                'flex items-center gap-3 p-3 rounded border cursor-pointer transition-all select-none',
                sendEmail ? 'border-cedr-teal bg-cedr-teal/5' : 'border-cedr-border hover:border-cedr-teal/40'
              )}>
                <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
                  className="accent-cedr-navy shrink-0" />
                <Mail size={14} className={sendEmail ? 'text-cedr-teal' : 'text-cedr-muted'} />
                <span className={clsx('text-sm font-medium', sendEmail ? 'text-cedr-navy' : 'text-cedr-text')}>
                  Notify mediator by email
                </span>
              </label>
              {sendEmail && (
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Optional message for the mediator…"
                  rows={2} className="input text-xs resize-none" />
              )}
            </>
          )}

          {/* Conflict error */}
          {conflict && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                This case already has a confirmed or pending mediation date. Only one is allowed per case.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
            <button onClick={handleBook} disabled={isPending || !canBook}
              className={clsx(
                'flex-1 text-sm px-4 py-2 rounded font-medium text-white transition-colors disabled:opacity-50',
                bookingType === 'pencilled'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              )}>
              {isPending ? 'Saving…' : bookingType === 'pencilled'
                ? `Pencil ${count} slot${count > 1 ? 's' : ''}`
                : `Book ${count} slot${count > 1 ? 's' : ''}`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
