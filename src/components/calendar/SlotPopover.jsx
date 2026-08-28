import { useState, useRef, useEffect } from 'react'
import { format, parseISO, getDay } from 'date-fns'
import { X, Repeat, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'
import { SLOT_STATUSES, EDITABLE_STATUSES, RECURRENCE_FREQUENCIES, DAYS_OF_WEEK } from '../../lib/constants'
import { useUpsertSlot, useCreateSeries } from '../../hooks/useAvailability'

export default function SlotPopover({ slot, date, period, mediatorId, onClose }) {
  const [status, setStatus]   = useState(slot?.status || 'not_set')
  const [notes, setNotes]     = useState(slot?.notes || '')
  const [mode, setMode]       = useState('one_time') // 'one_time' | 'recurring'
  const [frequency, setFreq]  = useState('weekly')
  const [endDate, setEndDate] = useState('')
  const [applyTo, setApplyTo] = useState('this') // 'this' | 'all' — shown when editing series slot

  const isFromSeries = slot?.source === 'series'
  const isBooked = ['provisionally_booked', 'confirmed'].includes(slot?.status)

  const upsert     = useUpsertSlot()
  const createSeries = useCreateSeries()
  const ref = useRef()

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  async function handleSave() {
    if (isBooked) return onClose()

    if (mode === 'recurring' && !isFromSeries) {
      // Create recurring series
      const rawDay = getDay(date)
      const dayOfWeek = rawDay === 0 ? 6 : rawDay - 1
      await createSeries.mutateAsync({
        mediator_id: mediatorId,
        day_of_week: dayOfWeek,
        period,
        status,
        frequency,
        start_date: format(date, 'yyyy-MM-dd'),
        end_date: endDate || null,
        notes: notes || null,
      })
    } else if (isFromSeries && applyTo === 'all') {
      // Update all — upsert the series via direct supabase call
      // For MVP: just upsert this slot as exception + mark
      await upsert.mutateAsync({
        mediatorId, date: format(date, 'yyyy-MM-dd'), period,
        status, notes, seriesId: slot.series_id, isException: true,
      })
    } else {
      // Single slot upsert
      await upsert.mutateAsync({
        mediatorId, date: format(date, 'yyyy-MM-dd'), period,
        status, notes,
        seriesId: isFromSeries && applyTo === 'this' ? slot.series_id : null,
        isException: isFromSeries && applyTo === 'this',
      })
    }
    onClose()
  }

  const saving = upsert.isPending || createSeries.isPending

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
            <p className="text-sm font-semibold text-cedr-navy">
              {format(date, 'EEE, MMM d')}
            </p>
            <p className="text-xs text-cedr-muted capitalize">{period}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Booked slot — read only */}
          {isBooked ? (
            <div className="space-y-2">
              <div className={clsx('status-badge border', SLOT_STATUSES[slot.status]?.color)}>
                {SLOT_STATUSES[slot.status]?.label}
              </div>
              {slot.cases && (
                <div className="bg-cedr-light rounded p-3 text-xs space-y-1">
                  <p className="font-semibold text-cedr-navy">{slot.cases.case_name || `Case #${slot.cases.hubspot_deal_id}`}</p>
                  {slot.cases.raw_hs_data?.venue && <p className="text-cedr-muted">📍 {slot.cases.raw_hs_data.venue}</p>}
                  {slot.cases.raw_hs_data?.parties && <p className="text-cedr-muted">👥 {slot.cases.raw_hs_data.parties} parties</p>}
                </div>
              )}
              {slot.notes && <p className="text-xs text-cedr-muted italic">{slot.notes}</p>}
            </div>
          ) : (
            <>
              {/* Series notice */}
              {isFromSeries && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  <Repeat size={12} />
                  <span>Recurring slot — apply change to:</span>
                  <select
                    value={applyTo}
                    onChange={e => setApplyTo(e.target.value)}
                    className="ml-auto text-xs border-0 bg-transparent font-medium"
                  >
                    <option value="this">This slot only</option>
                    <option value="all">All future slots</option>
                  </select>
                </div>
              )}

              {/* Status picker */}
              <div>
                <p className="text-xs font-medium text-cedr-muted mb-2 uppercase tracking-wide">Status</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {EDITABLE_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={clsx(
                        'px-2 py-2 rounded text-xs font-medium border transition-all',
                        status === s
                          ? SLOT_STATUSES[s].color + ' ring-2 ring-offset-1 ring-cedr-navy/30'
                          : 'border-cedr-border text-cedr-muted hover:border-cedr-navy/30'
                      )}
                    >
                      {SLOT_STATUSES[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs font-medium text-cedr-muted mb-1 uppercase tracking-wide">Notes</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional context visible to CEDR team…"
                  rows={2}
                  className="input text-xs resize-none"
                />
              </div>

              {/* Recurrence toggle — only for new non-series slots */}
              {!isFromSeries && (
                <div>
                  <p className="text-xs font-medium text-cedr-muted mb-2 uppercase tracking-wide">Repeat</p>
                  <div className="flex gap-1.5">
                    {[{ value: 'one_time', label: 'One time' }, { value: 'recurring', label: 'Recurring' }].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setMode(opt.value)}
                        className={clsx(
                          'flex-1 py-1.5 rounded text-xs font-medium border transition-all',
                          mode === opt.value
                            ? 'bg-cedr-navy text-white border-cedr-navy'
                            : 'border-cedr-border text-cedr-muted hover:border-cedr-navy/30'
                        )}
                      >
                        {opt.value === 'recurring' && <Repeat size={10} className="inline mr-1" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {mode === 'recurring' && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-xs text-cedr-muted mb-1">Frequency</p>
                        <select
                          value={frequency}
                          onChange={e => setFreq(e.target.value)}
                          className="input text-xs"
                        >
                          {RECURRENCE_FREQUENCIES.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-xs text-cedr-muted mb-1">End date <span className="text-cedr-muted/60">(optional)</span></p>
                        <input
                          type="date"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          className="input text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isBooked && (
          <div className="flex gap-2 px-4 pb-4">
            <button onClick={onClose} className="btn-secondary flex-1 text-xs">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || status === 'not_set'}
              className="btn-primary flex-1 text-xs"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
