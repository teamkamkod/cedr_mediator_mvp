import { useState, useMemo } from 'react'
import { X, CalendarRange, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { eachDayOfInterval, parseISO, format, differenceInCalendarDays } from 'date-fns'
import { useBulkUpsertPeriod } from '../../hooks/useAvailability'
import { useAuth } from '../../lib/auth'
import { SLOT_STATUSES } from '../../lib/constants'

const STATUSES_MEDIATOR = ['available', 'unavailable', 'ask_me']
const STATUSES_CRA      = ['available', 'unavailable']

export default function SetPeriodModal({ mediatorId, onClose }) {
  const { isCRA } = useAuth()
  const statuses  = isCRA ? STATUSES_CRA : STATUSES_MEDIATOR

  const today = format(new Date(), 'yyyy-MM-dd')

  const [startDate,       setStartDate]       = useState(today)
  const [endDate,         setEndDate]         = useState('')
  const [status,          setStatus]          = useState('available')
  const [includeWeekends, setIncludeWeekends] = useState(false)
  const [result,          setResult]          = useState(null) // { count, skipped }

  const bulk = useBulkUpsertPeriod()

  // Live preview of slot count
  const preview = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return null
    const dates = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
      .filter(d => includeWeekends || (d.getDay() !== 0 && d.getDay() !== 6))
    return dates.length * 2 // AM + PM
  }, [startDate, endDate, includeWeekends])

  const isValid = startDate && endDate && endDate >= startDate && status

  async function handleApply() {
    const res = await bulk.mutateAsync({ mediatorId, startDate, endDate, status, includeWeekends })
    setResult(res)
    // Auto-close after 2s
    setTimeout(onClose, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-lg border border-cedr-border w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cedr-border">
          <div className="flex items-center gap-2">
            <CalendarRange size={16} className="text-cedr-navy" />
            <p className="text-sm font-semibold text-cedr-navy">Set period</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        {/* Success state */}
        {result ? (
          <div className="p-6 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check size={18} className="text-green-600" />
            </div>
            <p className="text-sm font-semibold text-cedr-navy text-center">
              {result.count} slot{result.count !== 1 ? 's' : ''} updated
            </p>
            {result.skipped > 0 && (
              <p className="text-xs text-cedr-muted text-center">
                {result.skipped} slot{result.skipped !== 1 ? 's' : ''} skipped (already booked)
              </p>
            )}
          </div>
        ) : (
          <div className="p-5 space-y-4">

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-cedr-muted uppercase tracking-wide">From</label>
                <input type="date" value={startDate} min={today}
                  onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate('') }}
                  className="input text-sm w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-cedr-muted uppercase tracking-wide">To</label>
                <input type="date" value={endDate} min={startDate || today}
                  onChange={e => setEndDate(e.target.value)}
                  className="input text-sm w-full" />
              </div>
            </div>

            {/* Status picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cedr-muted uppercase tracking-wide">Status</label>
              <div className="flex gap-2">
                {statuses.map(s => {
                  const meta = SLOT_STATUSES[s]
                  return (
                    <button key={s} onClick={() => setStatus(s)}
                      className={clsx(
                        'flex-1 flex flex-col items-center gap-1.5 py-2.5 px-2 rounded border-2 transition-all text-xs font-semibold',
                        status === s
                          ? `${meta.color} border-current`
                          : 'border-cedr-border text-cedr-muted hover:border-cedr-muted'
                      )}>
                      <div className={`w-3 h-3 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Include weekends toggle */}
            <label className={clsx(
              'flex items-center gap-3 p-3 rounded border cursor-pointer transition-all select-none',
              includeWeekends ? 'border-cedr-navy bg-cedr-navy/5' : 'border-cedr-border hover:border-cedr-navy/30'
            )}>
              <input type="checkbox" checked={includeWeekends}
                onChange={e => setIncludeWeekends(e.target.checked)}
                className="accent-cedr-navy shrink-0" />
              <span className={clsx('text-sm font-medium', includeWeekends ? 'text-cedr-navy' : 'text-cedr-text')}>
                Include weekends
              </span>
            </label>

            {/* Preview */}
            {preview !== null && (
              <p className="text-xs text-cedr-muted text-center">
                {preview > 0
                  ? <><span className="font-semibold text-cedr-navy">{preview}</span> slots will be updated (booked slots skipped)</>
                  : 'No days in this range — try including weekends'}
              </p>
            )}

            {/* Footer */}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={handleApply}
                disabled={!isValid || preview === 0 || bulk.isPending}
                className="flex-1 text-sm px-4 py-2 rounded font-medium bg-cedr-navy text-white hover:bg-cedr-navy/90 transition-colors disabled:opacity-50">
                {bulk.isPending ? 'Applying…' : 'Apply'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
