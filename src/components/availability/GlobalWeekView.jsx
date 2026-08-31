import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday, parseISO } from 'date-fns'
import { clsx } from 'clsx'
import { Check } from 'lucide-react'
import { resolveSlot } from '../../hooks/useAvailability'

const AGGREGATE = {
  availability: { label: 'Availability',          bg: 'bg-green-100 border-green-300 text-green-800' },
  potential:    { label: 'Potential Availability', bg: 'bg-green-50  border-green-200 text-green-700' },
  none:         { label: 'No availability',        bg: 'bg-red-50    border-red-200   text-red-500'   },
}

function effectiveStatus(status) {
  return status === 'not_set' ? 'call_me' : status
}

function computeAggregate(date, period, mediators, slotsByMediator, seriesByMediator) {
  let hasAvailable = false
  let hasPotential = false
  for (const m of mediators) {
    const slot   = resolveSlot(date, period, slotsByMediator[m.id] || [], seriesByMediator[m.id] || [])
    const status = effectiveStatus(slot.status)
    if (status === 'available') { hasAvailable = true; break }
    if (status === 'call_me')   hasPotential = true
  }
  if (hasAvailable) return 'availability'
  if (hasPotential) return 'potential'
  return 'none'
}

function isInRange(dateStr, period, rangeSlots) {
  return rangeSlots.some(s => s.dateStr === dateStr && s.period === period)
}

export default function GlobalWeekView({
  currentDate, mediators, slotsByMediator, seriesByMediator,
  showWeekends, rangeSlots, onCellClick, onToggleRangeSlot,
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(currentDate,   { weekStartsOn: 1 })
  let   days      = eachDayOfInterval({ start: weekStart, end: weekEnd })
  if (!showWeekends) days = days.filter(d => d.getDay() !== 0 && d.getDay() !== 6)
  const colCount = days.length
  const hasRange = rangeSlots.length > 0

  return (
    <div className="flex-1 overflow-auto">
      {/* Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        className="border-b border-cedr-border bg-white sticky top-0 z-10">
        {days.map(day => (
          <div key={day.toISOString()} className="py-2.5 px-3 text-center border-r border-cedr-border last:border-r-0">
            <p className="text-[11px] font-semibold text-cedr-muted uppercase tracking-wide">{format(day, 'EEE')}</p>
            <div className={clsx(
              'w-9 h-9 rounded-full flex items-center justify-center mx-auto mt-1',
              isToday(day) ? 'bg-cedr-navy text-white' : 'text-cedr-text'
            )}>
              <p className="text-base font-bold">{format(day, 'd')}</p>
            </div>
            <p className="text-[10px] text-cedr-muted/60 mt-0.5">{format(day, 'MMM')}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          return (
            <div key={day.toISOString()} className="border-r border-cedr-border last:border-r-0 p-2 space-y-2">
              {['morning', 'afternoon'].map(period => {
                const agg      = computeAggregate(day, period, mediators, slotsByMediator, seriesByMediator)
                const cfg      = AGGREGATE[agg]
                const inRange  = isInRange(dateStr, period, rangeSlots)
                const clickable = agg !== 'none'
                // Dimmed: range is active AND this slot is not in range but is clickable
                const dimmed   = hasRange && !inRange && clickable

                return (
                  <div key={period} className="relative">
                    {/* Main cell */}
                    <button
                      disabled={agg === 'none'}
                      onClick={() => clickable && onCellClick(day, period)}
                      className={clsx(
                        'w-full flex flex-col gap-1 px-3 py-3 border rounded transition-all text-left min-h-[90px]',
                        cfg.bg,
                        clickable ? 'hover:opacity-80 cursor-pointer' : 'cursor-default',
                        inRange && 'border-cedr-navy border-2',
                        dimmed && 'opacity-50',
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                        {period === 'morning' ? 'AM' : 'PM'}
                      </span>
                      <span className={clsx('text-xs font-semibold leading-tight', !clickable && 'opacity-60')}>
                        {cfg.label}
                      </span>
                    </button>

                    {/* Checkbox — visible when range is active and slot is clickable */}
                    {hasRange && clickable && (
                      <button
                        onClick={e => { e.stopPropagation(); onToggleRangeSlot(dateStr, period) }}
                        className={clsx(
                          'absolute top-1.5 right-1.5 z-20 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                          inRange
                            ? 'bg-cedr-navy border-cedr-navy'
                            : 'border-cedr-muted/50 bg-white hover:border-cedr-navy/60'
                        )}
                        title={inRange ? 'Remove from selection' : 'Add to selection'}
                      >
                        {inRange && <Check size={9} className="text-white" />}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
