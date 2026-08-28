import { useState, useRef, useEffect } from 'react'
import { format, getDay } from 'date-fns'
import { X, Repeat, Sun, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import { SLOT_STATUSES, EDITABLE_STATUSES, RECURRENCE_FREQUENCIES } from '../../lib/constants'
import { useUpsertSlot, useCreateSeries } from '../../hooks/useAvailability'

export default function SlotPopover({ slot, date, period, mediatorId, onClose }) {
  const [status, setStatus]           = useState(slot?.status || 'not_set')
  const [notes, setNotes]             = useState(slot?.notes || '')
  const [mode, setMode]               = useState('one_time')
  const [frequency, setFreq]          = useState('weekly')
  const [endDate, setEndDate]         = useState('')
  const [fullDay, setFullDay]         = useState(false)
  const [confirmSeries, setConfirmSeries] = useState(false)

  const isNew        = !slot || slot.source === 'none'
  const isFromSeries = slot?.source === 'series'
  const isBooked     = ['provisionally_booked', 'confirmed'].includes(slot?.status)
  // Full day available for both one-time and recurring on fresh slots
  const canFullDay   = isNew && !isFromSeries

  const upsert       = useUpsertSlot()
  const createSeries = useCreateSeries()
  const ref          = useRef()

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  async function handleSave() {
    if (isBooked) return onClose()
    if (isFromSeries && !confirmSeries) { setConfirmSeries(true); return }

    const dateStr     = format(date, 'yyyy-MM-dd')
    const otherPeriod = period === 'morning' ? 'afternoon' : 'morning'

    if (mode === 'recurring' && !isFromSeries) {
      const rawDay    = getDay(date)
      const dayOfWeek = rawDay === 0 ? 6 : rawDay - 1
      const seriesBase = {
        mediator_id: mediatorId,
        day_of_week: dayOfWeek,
        status,
        frequency,
        start_date: dateStr,
        end_date:   endDate || null,
        notes:      notes || null,
      }
      if (fullDay) {
        // Create a series for each period in parallel
        await Promise.all([
          createSeries.mutateAsync({ ...seriesBase, period: 'morning' }),
          createSeries.mutateAsync({ ...seriesBase, period: 'afternoon' }),
        ])
      } else {
        await createSeries.mutateAsync({ ...seriesBase, period })
      }
    } else {
      // One-time upsert(s)
      await upsert.mutateAsync({
        mediatorId, date: dateStr, period, status, notes,
        seriesId:    isFromSeries ? slot.series_id : null,
        isException: isFromSeries,
      })
      if (fullDay && canFullDay && mode !== 'recurring') {
        await upsert.mutateAsync({
          mediatorId, date: dateStr, period: otherPeriod, status, notes,
          seriesId: null, isException: false,
        })
      }
    }
    onClose()
  }

  async function handleSeriesConfirm(scope) {
    await upsert.mutateAsync({
      mediatorId,
      date:        format(date, 'yyyy-MM-dd'),
      period,
      status,
      notes,
      seriesId:    slot.series_id,
      isException: scope === 'this',
    })
    onClose()
  }

  const saving = upsert.isPending || createSeries.isPending

  // Conflict warning: shown when recurring + full day selected
  const showConflictWarning = mode === 'recurring' && fullDay && canFullDay

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
            <p className="text-xs text-cedr-muted capitalize">
              {fullDay && canFullDay ? 'Full day' : period}
              {mode === 'recurring' ? ' · recurring' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        {/* ── Series confirmation ── */}
        {confirmSeries ? (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-cedr-navy">
              <Repeat size={15} className="text-amber-600" />
              This is a recurring slot
            </div>
            <p className="text-xs text-cedr-muted leading-relaxed">
              Apply this change only to <strong>{format(date, 'EEE d MMM')}</strong>,
              or to all future occurrences?
            </p>
            <div className="space-y-2">
              <button onClick={() => handleSeriesConfirm('this')} disabled={saving}
                className="w-full text-left px-4 py-3 rounded border border-cedr-border hover:bg-cedr-light transition-colors">
                <p className="text-sm font-medium text-cedr-text">This slot only</p>
                <p className="text-xs text-cedr-muted mt-0.5">Only {format(date, 'EEE d MMM')} will be updated</p>
              </button>
              <button onClick={() => handleSeriesConfirm('all')} disabled={saving}
                className="w-full text-left px-4 py-3 rounded border border-cedr-border hover:bg-cedr-light transition-colors">
                <p className="text-sm font-medium text-cedr-text">All future slots</p>
                <p className="text-xs text-cedr-muted mt-0.5">All upcoming occurrences will be updated</p>
              </button>
            </div>
            <button onClick={() => setConfirmSeries(false)}
              className="text-xs text-cedr-muted hover:text-cedr-text transition-colors w-full text-center">
              ← Back
            </button>
          </div>

        /* ── Booked: read only ── */
        ) : isBooked ? (
          <div className="p-4 space-y-3">
            <div className={clsx('status-badge border', SLOT_STATUSES[slot.status]?.color)}>
              {SLOT_STATUSES[slot.status]?.label}
            </div>
            {slot.cases && (
              <div className="bg-cedr-light rounded p-3 text-xs space-y-1">
                <p className="font-semibold text-cedr-navy">
                  {slot.cases.case_name || `Case #${slot.cases.hubspot_deal_id}`}
                </p>
                {slot.cases.raw_hs_data?.venue   && <p className="text-cedr-muted">📍 {slot.cases.raw_hs_data.venue}</p>}
                {slot.cases.raw_hs_data?.parties && <p className="text-cedr-muted">👥 {slot.cases.raw_hs_data.parties} parties</p>}
              </div>
            )}
            {slot.notes && <p className="text-xs text-cedr-muted italic">{slot.notes}</p>}
          </div>

        /* ── Edit form ── */
        ) : (
          <>
            <div className="p-4 space-y-4">

              {isFromSeries && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  <Repeat size={12} />
                  Recurring slot — you'll choose the scope on save
                </div>
              )}

              {/* Full day toggle */}
              {canFullDay && (
                <label className={clsx(
                  'flex items-center justify-between p-3 rounded border cursor-pointer transition-all select-none',
                  fullDay ? 'border-cedr-navy bg-cedr-light' : 'border-cedr-border hover:border-cedr-navy/30'
                )}>
                  <div className="flex items-center gap-2">
                    <Sun size={14} className={fullDay ? 'text-cedr-navy' : 'text-cedr-muted'} />
                    <span className={clsx('text-sm font-medium', fullDay ? 'text-cedr-navy' : 'text-cedr-text')}>
                      Full day
                    </span>
                    <span className="text-xs text-cedr-muted">— sets AM & PM at once</span>
                  </div>
                  <div className={clsx('w-9 h-5 rounded-full transition-colors relative', fullDay ? 'bg-cedr-navy' : 'bg-cedr-border')}>
                    <div className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', fullDay ? 'translate-x-4' : 'translate-x-0.5')} />
                  </div>
                  <input type="checkbox" checked={fullDay} onChange={e => setFullDay(e.target.checked)} className="sr-only" />
                </label>
              )}

              {/* Conflict warning — recurring + full day */}
              {showConflictWarning && (
                <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2.5">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-600" />
                  <span className="leading-relaxed">
                    Two recurring rules will be created (AM & PM). Dates that already have individual slots set will <strong>not</strong> be affected — existing entries always take priority over recurring rules.
                  </span>
                </div>
              )}

              {/* Status picker */}
              <div>
                <p className="text-xs font-medium text-cedr-muted mb-2 uppercase tracking-wide">Status</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {EDITABLE_STATUSES.map(s => (
                    <button key={s} onClick={() => setStatus(s)}
                      className={clsx(
                        'px-2 py-2 rounded text-xs font-medium border transition-all',
                        status === s
                          ? SLOT_STATUSES[s].color + ' ring-2 ring-offset-1 ring-cedr-navy/30'
                          : 'border-cedr-border text-cedr-muted hover:border-cedr-navy/30'
                      )}>
                      {SLOT_STATUSES[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs font-medium text-cedr-muted mb-1 uppercase tracking-wide">Notes</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Optional context visible to CEDR team…"
                  rows={2} className="input text-xs resize-none" />
              </div>

              {/* Recurrence toggle */}
              {!isFromSeries && (
                <div>
                  <p className="text-xs font-medium text-cedr-muted mb-2 uppercase tracking-wide">Repeat</p>
                  <div className="flex gap-1.5">
                    {[{ value: 'one_time', label: 'One time' }, { value: 'recurring', label: 'Recurring' }].map(opt => (
                      <button key={opt.value} onClick={() => setMode(opt.value)}
                        className={clsx(
                          'flex-1 py-1.5 rounded text-xs font-medium border transition-all',
                          mode === opt.value
                            ? 'bg-cedr-navy text-white border-cedr-navy'
                            : 'border-cedr-border text-cedr-muted hover:border-cedr-navy/30'
                        )}>
                        {opt.value === 'recurring' && <Repeat size={10} className="inline mr-1" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {mode === 'recurring' && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-xs text-cedr-muted mb-1">Frequency</p>
                        <select value={frequency} onChange={e => setFreq(e.target.value)} className="input text-xs">
                          {RECURRENCE_FREQUENCIES.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-xs text-cedr-muted mb-1">End date <span className="opacity-60">(optional)</span></p>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input text-xs" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 px-4 pb-4">
              <button onClick={onClose} className="btn-secondary flex-1 text-xs">Cancel</button>
              <button onClick={handleSave} disabled={saving || status === 'not_set'} className="btn-primary flex-1 text-xs">
                {saving ? 'Saving…'
                  : mode === 'recurring' && fullDay ? 'Save recurring full day'
                  : fullDay && canFullDay          ? 'Save full day'
                  : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
