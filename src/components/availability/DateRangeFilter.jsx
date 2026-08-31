import { X } from 'lucide-react'
import { clsx } from 'clsx'

export default function DateRangeFilter({ rangeStart, rangeEnd, onChange, onClear }) {
  function update(key, field, value) {
    const current = key === 'start' ? rangeStart : rangeEnd
    const updated  = { ...(current || { dateStr: '', period: 'morning' }), [field]: value }
    onChange(key, updated.dateStr ? updated : null)
  }

  const isValid = rangeStart?.dateStr && rangeEnd?.dateStr && rangeStart.dateStr <= rangeEnd.dateStr
  const hasRange = rangeStart?.dateStr || rangeEnd?.dateStr

  return (
    <div className="flex items-center gap-3 px-6 py-2.5 bg-cedr-light border-b border-cedr-border">
      <span className="text-xs font-semibold text-cedr-muted uppercase tracking-wide shrink-0">
        Case date range
      </span>

      {/* Start */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={rangeStart?.dateStr || ''}
          onChange={e => update('start', 'dateStr', e.target.value)}
          className="input text-xs py-1 px-2 w-36"
        />
        <PeriodToggle
          value={rangeStart?.period || 'morning'}
          onChange={v => update('start', 'period', v)}
        />
      </div>

      <span className="text-cedr-muted text-sm">→</span>

      {/* End */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={rangeEnd?.dateStr || ''}
          min={rangeStart?.dateStr || ''}
          onChange={e => update('end', 'dateStr', e.target.value)}
          className="input text-xs py-1 px-2 w-36"
        />
        <PeriodToggle
          value={rangeEnd?.period || 'afternoon'}
          onChange={v => update('end', 'period', v)}
        />
      </div>

      {hasRange && (
        <button onClick={onClear} className="text-cedr-muted hover:text-cedr-text transition-colors">
          <X size={14} />
        </button>
      )}

      {hasRange && !isValid && (
        <span className="text-xs text-red-500">End must be ≥ start</span>
      )}
      {isValid && (
        <span className="text-xs text-cedr-teal font-medium">Range active</span>
      )}
    </div>
  )
}

function PeriodToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5 bg-white border border-cedr-border rounded p-0.5">
      {['morning', 'afternoon'].map(p => (
        <button key={p} onClick={() => onChange(p)}
          className={clsx(
            'px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors',
            value === p ? 'bg-cedr-navy text-white' : 'text-cedr-muted hover:text-cedr-text'
          )}>
          {p === 'morning' ? 'AM' : 'PM'}
        </button>
      ))}
    </div>
  )
}
