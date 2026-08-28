import { format, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { clsx } from 'clsx'

export default function CalendarHeader({ view, setView, currentDate, setCurrentDate }) {
  function goToday() { setCurrentDate(new Date()) }

  function goPrev() {
    setCurrentDate(prev => view === 'week' ? subWeeks(prev, 1) : subMonths(prev, 1))
  }

  function goNext() {
    setCurrentDate(prev => view === 'week' ? addWeeks(prev, 1) : addMonths(prev, 1))
  }

  function getTitle() {
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end   = endOfWeek(currentDate, { weekStartsOn: 1 })
      if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy')) {
        return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`
      }
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    }
    return format(currentDate, 'MMMM yyyy')
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-cedr-border">
      {/* Left: nav */}
      <div className="flex items-center gap-2">
        <button onClick={goToday} className="btn-secondary text-xs px-3 py-1.5">
          Today
        </button>
        <button onClick={goPrev} className="p-1.5 rounded hover:bg-cedr-light transition-colors">
          <ChevronLeft size={16} className="text-cedr-muted" />
        </button>
        <button onClick={goNext} className="p-1.5 rounded hover:bg-cedr-light transition-colors">
          <ChevronRight size={16} className="text-cedr-muted" />
        </button>
        <h2 className="text-base font-semibold text-cedr-navy ml-2 min-w-[220px]">
          {getTitle()}
        </h2>
      </div>

      {/* Right: view toggle */}
      <div className="flex items-center gap-1 bg-cedr-light rounded p-1">
        {['week', 'month'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={clsx(
              'px-3 py-1 rounded text-sm font-medium transition-colors capitalize',
              view === v
                ? 'bg-white text-cedr-navy shadow-card'
                : 'text-cedr-muted hover:text-cedr-text'
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}
