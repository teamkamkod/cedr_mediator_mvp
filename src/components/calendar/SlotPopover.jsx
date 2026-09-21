import { useState, useRef, useEffect, forwardRef } from 'react'
import { format, getDay } from 'date-fns'
import { X, Repeat, Sun, AlertTriangle, Trash2, Pencil, Mail, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { SLOT_STATUSES, EDITABLE_STATUSES, CRA_EDITABLE_STATUSES, RECURRENCE_FREQUENCIES } from '../../lib/constants'
import {
  useUpsertSlot, useCreateSeries,
  useDeleteSlot, useDeleteSeriesException, useDeactivateSeriesFrom,
  usePencilSlot, useCreateProvisionalBooking,
} from '../../hooks/useAvailability'
import { useAuth } from '../../lib/auth'
import { useCase } from '../../lib/CaseContext'
import CaseDropdown from '../case/CaseDropdown'
import DealInfoModal from '../common/DealInfoModal'
import InfoBadge from '../common/InfoBadge'

// ─────────────────────────────────────────────────────────────
// CRA ADAPTIVE SECTION — handles all CRA slot interactions
// ─────────────────────────────────────────────────────────────
function CRAAdaptiveSection({ slot, date, period, mediatorId, onClose, activeMediatorProfile }) {
  const currentStatus = slot?.status || 'not_set'
  const isMutableBase = ['not_set','available','unavailable'].includes(currentStatus)
  const isAskMe       = currentStatus === 'ask_me'
  const isPencilled   = currentStatus === 'pencilled'
  const isProvisional = currentStatus === 'provisionally_booked'
  const isConfirmed   = currentStatus === 'confirmed'

  const [step,         setStep]         = useState('view')  // 'view'|'edit_status'|'pencil_form'|'provisional_form'|'confirm_overwrite'
  const [craStatus,    setCraStatus]    = useState(null)    // chosen status in edit_status step
  const [localCase,    setLocalCase]    = useState(() => {
    // Carry forward case context from existing slot (pencilled / provisional)
    if (slot?.case_id) {
      return {
        case_id:     slot.case_id,
        record_id:   slot.hubspot_record_id   || null,
        object_type: slot.hubspot_object_type || 'deal',
        record_name: slot.record_name         || slot.case_id,
      }
    }
    return selectedCase || null
  })
  const [craFullDay,   setCraFullDay]   = useState(false)
  const [sendEmail,    setSendEmail]    = useState(false)
  const [message,      setMessage]      = useState('')
  const [confirmDel,   setConfirmDel]   = useState(false)
  const [dealModal,    setDealModal]    = useState(false)

  const deleteSlot      = useDeleteSlot()
  const pencilSlot      = usePencilSlot()
  const createProvis    = useCreateProvisionalBooking()
  const upsert          = useUpsertSlot()
  const ref             = useRef()

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  const meta    = SLOT_STATUSES[currentStatus] || SLOT_STATUSES.not_set
  const dateStr = format(date, 'yyyy-MM-dd')
  const hubId   = activeMediatorProfile?.hubspot_mediator_object_id

  async function handleSaveStatus() {
    // save available or unavailable
    await upsert.mutateAsync({ mediatorId, date: dateStr, period, status: craStatus, notes: null, mode: 'one_time' })
    onClose()
  }

  async function handlePencil() {
    if (!localCase) return
    await pencilSlot.mutateAsync({ mediatorId, date: dateStr, period, fullDay: craFullDay, caseData: localCase, hubspotMediatorId: hubId })
    onClose()
  }

  async function handleProvisional() {
    if (!localCase) return
    await createProvis.mutateAsync({
      mediatorId, date: dateStr, period, fullDay: craFullDay,
      sendEmail, message: sendEmail ? message : null,
      hubspotMediatorId: hubId, caseData: localCase,
    })
    onClose()
  }

  async function handleDelete() {
    if (slot?.id) await deleteSlot.mutateAsync({ slotId: slot.id, mediatorId })
    onClose()
  }

  const saving = deleteSlot.isPending || pencilSlot.isPending || createProvis.isPending || upsert.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={onClose}>
      <div ref={ref} onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-popover border border-cedr-border w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-cedr-border">
          <div>
            <p className="text-sm font-semibold text-cedr-navy">{format(date, 'EEE, MMM d')}</p>
            <p className="text-xs text-cedr-muted capitalize">{period}</p>
          </div>
          <div className="flex items-center gap-2">
            {(currentStatus !== 'not_set') && (
              <span className={clsx('inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium', meta.color)}>
                <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
              </span>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
              <X size={14} className="text-cedr-muted" />
            </button>
          </div>
        </div>

        {/* ── DELETE CONFIRM ── */}
        {confirmDel && (
          <div className="p-5 space-y-4">
            <p className="text-sm font-medium text-red-700 flex items-center gap-2">
              <Trash2 size={15} />Delete this slot?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(false)} className="btn-secondary flex-1 text-xs">Cancel</button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 text-xs px-4 py-2 rounded font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}

        {/* ── CONFIRM OVERWRITE (pencilled ↔ provisional) ── */}
        {!confirmDel && step === 'confirm_overwrite' && (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded">
              <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Overwrite existing {currentStatus === 'pencilled' ? 'pencil' : 'provisional booking'}?</p>
                <p className="text-xs text-amber-700 mt-1">
                  This slot is currently <strong>{meta.label}</strong>. Continuing will replace it with a{' '}
                  {craStatus === 'pencilled' ? 'pencil' : 'provisional booking'}.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setStep(craStatus === 'pencilled' ? 'pencil_form' : 'provisional_form'); setConfirmDel(false) }}
                className="btn-secondary flex-1 text-xs">Cancel</button>
              <button onClick={async () => {
                if (slot?.id) await deleteSlot.mutateAsync({ slotId: slot.id, mediatorId })
                setStep(craStatus === 'pencilled' ? 'pencil_form' : 'provisional_form')
                setConfirmDel(false)
              }} disabled={saving}
                className="flex-1 text-xs px-4 py-2 rounded font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50">
                {saving ? 'Processing…' : 'Overwrite'}
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW / DEFAULT ── */}
        {!confirmDel && step === 'view' && (
          <div className="p-5 space-y-4">
            {/* READ-ONLY: confirmed */}
            {isConfirmed && <p className="text-xs text-cedr-muted">This slot is confirmed. No changes allowed.</p>}

            {/* READ-ONLY + DELETE: ask_me */}
            {isAskMe && (
              <>
                <p className="text-xs text-cedr-muted">Ask Me slots are set by the mediator. You can only delete this slot.</p>
                <div className="flex gap-2">
                  <button onClick={onClose} className="btn-secondary flex-1 text-sm">Close</button>
                  <button onClick={() => setConfirmDel(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors">
                    <Trash2 size={13} />Delete
                  </button>
                </div>
              </>
            )}

            {/* DELETE: pencilled */}
            {isPencilled && (
              <>
                <div className="space-y-1">
                  {slot?.record_name && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-cedr-muted">Case: <span className="font-medium text-cedr-text">{slot.record_name}</span></p>
                      {slot?.hubspot_record_id && (
                        <InfoBadge recordId={slot.hubspot_record_id} recordName={slot.record_name}
                          onInfoClick={() => setDealModal(true)} />
                      )}
                    </div>
                  )}
                  {slot?.case_id && <p className="text-xs text-cedr-muted">ID: {slot.case_id}</p>}
                  {slot?.notes && <p className="text-xs text-cedr-muted italic">{slot.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={onClose} className="btn-secondary flex-1 text-sm">Close</button>
                  <button onClick={() => { setCraStatus('provisional'); setStep('confirm_overwrite') }}
                    className="flex-1 text-sm px-3 py-2 rounded font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                    Convert to Provisional
                  </button>
                  <button onClick={() => setConfirmDel(true)}
                    className="p-2 rounded text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}

            {/* PROVISIONAL: view + convert to pencil */}
            {isProvisional && (
              <>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 border border-purple-200 rounded">
                  <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-purple-800">Provisional Booking</p>
                    {slot?.record_name && <p className="text-xs text-purple-600 truncate">{slot.record_name}</p>}
                  </div>
                  {slot?.hubspot_record_id && (
                    <InfoBadge recordId={slot.hubspot_record_id} recordName={slot.record_name}
                      onInfoClick={() => setDealModal(true)} />
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={onClose} className="btn-secondary flex-1 text-sm">Close</button>
                  <button onClick={() => { setCraStatus('pencilled'); setStep('confirm_overwrite') }}
                    className="flex items-center gap-1.5 flex-1 text-sm px-3 py-2 rounded font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                    <Pencil size={13} />Convert to Pencil
                  </button>
                </div>
              </>
            )}

            {/* MUTABLE: available / unavailable / not_set → show action buttons */}
            {isMutableBase && (
              <>
                {slot?.notes && <p className="text-xs text-cedr-muted italic">{slot.notes}</p>}
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { setCraStatus('available'); setStep('edit_status') }}
                    className="flex flex-col items-center gap-1 p-3 rounded border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-colors">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs font-semibold text-green-800">Available</span>
                  </button>
                  <button onClick={() => { setCraStatus('unavailable'); setStep('edit_status') }}
                    className="flex flex-col items-center gap-1 p-3 rounded border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs font-semibold text-red-800">Unavailable</span>
                  </button>
                  <button onClick={() => { setCraStatus('pencilled'); setStep('pencil_form') }}
                    className="flex flex-col items-center gap-1 p-3 rounded border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors">
                    <Pencil size={14} className="text-amber-600" />
                    <span className="text-xs font-semibold text-amber-800">Pencil</span>
                  </button>
                </div>
                <button onClick={() => { setCraStatus('provisional'); setStep('provisional_form') }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-sm font-semibold text-purple-800">Provisional Booking</span>
                </button>
                {currentStatus !== 'not_set' && (
                  <button onClick={() => setConfirmDel(true)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded text-xs text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors">
                    <Trash2 size={12} />Remove slot
                  </button>
                )}
              </>
            )}

            {isConfirmed && (
              <button onClick={onClose} className="btn-secondary w-full text-sm">Close</button>
            )}
          </div>
        )}

        {/* ── EDIT STATUS (available / unavailable) ── */}
        {!confirmDel && step === 'edit_status' && (
          <div className="p-5 space-y-4">
            <p className="text-sm font-medium text-cedr-navy capitalize">
              Set slot as <span className={craStatus === 'available' ? 'text-green-700' : 'text-red-700'}>{craStatus}</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setStep('view')} className="btn-secondary flex-1 text-sm">Back</button>
              <button onClick={handleSaveStatus} disabled={saving}
                className={clsx('flex-1 text-sm px-4 py-2 rounded font-medium text-white transition-colors disabled:opacity-50',
                  craStatus === 'available' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700')}>
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        {/* ── PENCIL FORM ── */}
        {!confirmDel && step === 'pencil_form' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded">
              <Pencil size={14} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Pencilling a slot</span>
            </div>
            <CaseDropdown onChange={setLocalCase} />
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={craFullDay} onChange={e => setCraFullDay(e.target.checked)}
                className="accent-cedr-navy" />
              <span className="text-sm text-cedr-text">Full day (AM + PM)</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => setStep('view')} className="btn-secondary flex-1 text-sm">Back</button>
              <button onClick={() => {
                // Conflict already resolved via confirm_overwrite step — go straight to pencil
                handlePencil()
              }} disabled={saving || !localCase}
                className="flex-1 text-sm px-4 py-2 rounded font-medium bg-amber-700 text-white hover:bg-amber-800 transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Pencil slot'}
              </button>
            </div>
          </div>
        )}

        {/* ── PROVISIONAL FORM ── */}
        {!confirmDel && step === 'provisional_form' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-sm font-semibold text-purple-800">Provisional Booking</span>
            </div>
            <CaseDropdown onChange={setLocalCase} />
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={craFullDay} onChange={e => setCraFullDay(e.target.checked)}
                className="accent-cedr-navy" />
              <span className="text-sm text-cedr-text">Full day (AM + PM)</span>
            </label>
            <label className={clsx('flex items-center gap-3 p-3 rounded border cursor-pointer transition-all select-none',
              sendEmail ? 'border-cedr-teal bg-cedr-teal/5' : 'border-cedr-border hover:border-cedr-teal/40')}>
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
                className="accent-cedr-navy shrink-0" />
              <Mail size={14} className={sendEmail ? 'text-cedr-teal' : 'text-cedr-muted'} />
              <span className={clsx('text-sm font-medium', sendEmail ? 'text-cedr-navy' : 'text-cedr-text')}>
                Notify mediator
              </span>
            </label>
            {sendEmail && (
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Optional message…" rows={2} className="input text-xs resize-none" />
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep('view')} className="btn-secondary flex-1 text-sm">Back</button>
              <button onClick={() => {
                // Conflict already resolved via confirm_overwrite step — go straight to book
                handleProvisional()
              }} disabled={saving || !localCase}
                className="flex-1 text-sm px-4 py-2 rounded font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Book'}
              </button>
            </div>
          </div>
        )}
      </div>
      {dealModal && slot?.hubspot_record_id && (
        <DealInfoModal recordId={slot.hubspot_record_id} recordName={slot.record_name} onClose={() => setDealModal(false)} />
      )}
    </div>
  )
}
// ─────────────────────────────────────────────────────────────
// step: 'edit' | 'confirm_series_edit' | 'confirm_delete' | 'confirm_delete_series'
export default function SlotPopover({ slot, date, period, mediatorId, onClose, readOnly = false }) {
  const { isCRA, isSuperAdmin, activeMediatorProfile } = useAuth()

  const [step, setStep]         = useState('edit')
  const [status, setStatus]     = useState(slot?.status || 'not_set')
  const [notes, setNotes]       = useState(slot?.notes  || '')
  const [mode, setMode]         = useState('one_time')
  const [frequency, setFreq]    = useState('weekly')
  const [endDate, setEndDate]   = useState('')
  const [fullDay, setFullDay]   = useState(false)

  const isNew        = !slot || slot.source === 'none'
  const isFromSeries = slot?.source === 'series'
  const canDelete    = slot?.source === 'explicit' || slot?.source === 'series'
  const canFullDay   = isNew && !isFromSeries

  const upsert           = useUpsertSlot()
  const createSeries     = useCreateSeries()
  const deleteSlot       = useDeleteSlot()
  const deleteException  = useDeleteSeriesException()
  const deactivateSeries = useDeactivateSeriesFrom()
  const ref              = useRef()

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  // ── Read-only (past slots) ─────────────────────────────────
  if (readOnly) {
    const meta = SLOT_STATUSES[slot?.status] || SLOT_STATUSES.not_set
    const canDeletePencil = isCRA && slot?.status === 'pencilled'
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={onClose}>
        <div ref={ref} onClick={e => e.stopPropagation()}
          className="bg-white rounded-lg shadow-popover border border-cedr-border w-72 overflow-hidden">
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
            <div className={clsx('inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium', meta.color)}>
              <div className={`w-2 h-2 rounded-full ${meta.dot}`} />{meta.label || 'Not set'}
            </div>
            {slot?.notes && <p className="text-xs text-cedr-muted italic">{slot.notes}</p>}
            <p className="text-xs text-cedr-muted/60">Past slots are read-only.</p>
          </div>
          <div className="flex gap-2 px-4 pb-4">
            {canDeletePencil && (
              <button onClick={() => deleteSlot.mutate({ slotId: slot.id, mediatorId }, { onSuccess: onClose })}
                disabled={deleteSlot.isPending}
                className="p-2 rounded text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">Close</button>
          </div>
        </div>
      </div>
    )
  }

  // ── CRA → adaptive section ─────────────────────────────────
  if (isCRA) {
    return (
      <CRAAdaptiveSection
        slot={slot} date={date} period={period} mediatorId={mediatorId}
        onClose={onClose} activeMediatorProfile={activeMediatorProfile}
      />
    )
  }

  // ── Mediator / Clerk / Super Admin — original popover ──────
  const editableStatuses = isSuperAdmin ? Object.keys(SLOT_STATUSES).filter(s => s !== 'not_set' && s !== 'pencilled') : EDITABLE_STATUSES
  const isBooked         = ['provisionally_booked', 'confirmed'].includes(slot?.status)

  async function handleSave() {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (mode === 'one_time') {
      await upsert.mutateAsync({ mediatorId, date: dateStr, period, status, notes, mode })
      onClose()
    } else {
      setStep('confirm_series_edit')
    }
  }

  async function confirmSeriesEdit() {
    const dateStr = format(date, 'yyyy-MM-dd')
    await createSeries.mutateAsync({ mediatorId, date: dateStr, period, status, notes, frequency, endDate: endDate || null })
    onClose()
  }

  async function handleDelete() {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (slot?.source === 'explicit') {
      await deleteSlot.mutateAsync({ slotId: slot.id, mediatorId })
    } else if (slot?.source === 'series') {
      setStep('confirm_delete_series')
      return
    }
    onClose()
  }

  async function confirmDeleteSeries(scope) {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (scope === 'one') {
      await deleteException.mutateAsync({ mediatorId, date: dateStr, period, seriesId: slot.id })
    } else {
      await deactivateSeries.mutateAsync({ seriesId: slot.id, fromDate: dateStr, mediatorId })
    }
    onClose()
  }

  const saving = upsert.isPending || createSeries.isPending || deleteSlot.isPending || deleteException.isPending || deactivateSeries.isPending
  const dayOfWeek = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][((getDay(date) + 6) % 7)]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={onClose}>
      <div ref={ref} onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-popover border border-cedr-border w-full max-w-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-cedr-border">
          <div>
            <p className="text-sm font-semibold text-cedr-navy">{format(date, 'EEE, MMM d')}</p>
            <p className="text-xs text-cedr-muted capitalize">
              {fullDay ? 'Full day' : period}
              {isFromSeries && ' · Recurring'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        {/* ── confirm series edit ── */}
        {step === 'confirm_series_edit' && (
          <div className="p-5 space-y-4">
            <p className="text-sm font-medium text-cedr-navy flex items-center gap-2">
              <Repeat size={15} />How should this apply?
            </p>
            {[
              { label: `This ${period} only`,    scope: 'one'    },
              { label: 'This and future slots',   scope: 'future' },
            ].map(({ label, scope }) => (
              <button key={scope} onClick={() => { setMode(scope === 'one' ? 'one_time' : 'from_here'); confirmSeriesEdit() }}
                disabled={saving}
                className="w-full text-left px-4 py-3 rounded border border-cedr-border hover:bg-cedr-light text-sm transition-colors disabled:opacity-50">
                {label}
              </button>
            ))}
            <button onClick={() => setStep('edit')} className="btn-secondary w-full text-sm">Back</button>
          </div>
        )}

        {/* ── confirm delete series ── */}
        {step === 'confirm_delete_series' && (
          <div className="p-5 space-y-4">
            <p className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertTriangle size={15} />Delete which occurrences?
            </p>
            {[
              { label: `This ${period} only`,    scope: 'one'    },
              { label: 'This and future slots',  scope: 'future' },
            ].map(({ label, scope }) => (
              <button key={scope} onClick={() => confirmDeleteSeries(scope)}
                disabled={saving}
                className="w-full text-left px-4 py-3 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-sm text-red-800 transition-colors disabled:opacity-50">
                {label}
              </button>
            ))}
            <button onClick={() => setStep('edit')} className="btn-secondary w-full text-sm">Back</button>
          </div>
        )}

        {/* ── main edit ── */}
        {step === 'edit' && (
          <div className="p-5 space-y-4">
            {isBooked ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 border border-purple-200 rounded">
                <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <p className="text-sm font-semibold text-purple-800">
                  {slot.status === 'confirmed' ? 'Confirmed' : 'Provisionally Booked'}
                </p>
              </div>
            ) : (
              <>
                {/* Status picker */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-cedr-muted uppercase tracking-wide">Status</p>
                  <div className="flex gap-2 flex-wrap">
                    {editableStatuses.map(s => {
                      const m = SLOT_STATUSES[s]
                      return (
                        <button key={s} onClick={() => setStatus(s)}
                          className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-all',
                            status === s ? `${m.color} border-current shadow-sm` : 'border-cedr-border text-cedr-muted hover:border-cedr-muted')}>
                          <div className={`w-2 h-2 rounded-full ${m.dot}`} />{m.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Full day (new slots only) */}
                {canFullDay && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={fullDay} onChange={e => setFullDay(e.target.checked)}
                      className="accent-cedr-navy" />
                    <Sun size={14} className="text-cedr-muted" />
                    <span className="text-sm text-cedr-text">Full day (AM + PM)</span>
                  </label>
                )}

                {/* Notes */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-cedr-muted uppercase tracking-wide">Notes</p>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Optional note…" rows={2} className="input text-xs resize-none" />
                </div>

                {/* Recurrence */}
                {isNew && !isFromSeries && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-cedr-muted uppercase tracking-wide">Recurrence</p>
                    <div className="flex gap-2">
                      {[{ value: 'one_time', label: 'Once' }, { value: 'recurring', label: 'Recurring' }].map(opt => (
                        <button key={opt.value} onClick={() => setMode(opt.value)}
                          className={clsx('flex-1 py-1.5 rounded border text-xs font-medium transition-colors',
                            mode === opt.value ? 'bg-cedr-navy text-white border-cedr-navy' : 'border-cedr-border text-cedr-muted hover:border-cedr-navy/30')}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {mode === 'recurring' && (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          {RECURRENCE_FREQUENCIES.map(f => (
                            <button key={f.value} onClick={() => setFreq(f.value)}
                              className={clsx('py-1.5 rounded border text-xs transition-colors',
                                frequency === f.value ? 'bg-cedr-navy text-white border-cedr-navy' : 'border-cedr-border text-cedr-muted hover:border-cedr-navy/30')}>
                              {f.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-cedr-muted whitespace-nowrap">Every {dayOfWeek} until</span>
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="input text-xs flex-1" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Footer */}
            <div className="flex items-center gap-2 pt-1">
              {canDelete && !isBooked && (
                <button onClick={handleDelete} disabled={saving}
                  className="p-2 rounded text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={onClose} className={clsx('btn-secondary text-sm', canDelete && !isBooked ? 'flex-1' : 'w-full')}>
                {isBooked ? 'Close' : 'Cancel'}
              </button>
              {!isBooked && (
                <button onClick={handleSave} disabled={saving || status === 'not_set'}
                  className="flex-1 text-sm px-4 py-2 rounded font-medium bg-cedr-navy text-white hover:bg-cedr-navy/90 transition-colors disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
