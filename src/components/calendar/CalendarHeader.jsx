import { format, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../../lib/auth'
import { Avatar } from '../layout/AppLayout'

export default function CalendarHeader({ view, setView, currentDate, setCurrentDate }) {
  const { activeMediatorProfile, isClerk, isSuperAdmin } = useAuth()

  function goToday() { setCurrentDate(new Date()) }
  function goPrev()  { setCurrentDate(prev => view === 'week' ? subWeeks(prev, 1) : subMonths(prev, 1)) }
  function goNext()  { setCurrentDate(prev => view === 'week' ? addWeeks(prev, 1) : addMonths(prev, 1)) }

  function getTitle() {
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end   = endOfWeek(currentDate,   { weekStartsOn: 1 })
      if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy'))
        return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    }
    return format(currentDate, 'MMMM yyyy')
  }

  // Show mediator identity when a clerk or super_admin is viewing
  const showMediatorBadge = (isClerk || isSuperAdmin) && activeMediatorProfile

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-cedr-border gap-4">
      {/* Left: nav + date */}
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={goToday} className="btn-secondary text-xs px-3 py-1.5 shrink-0">Today</button>
        <button onClick={goPrev}  className="p-1.5 rounded hover:bg-cedr-light transition-colors shrink-0">
          <ChevronLeft size={16} className="text-cedr-muted" />
        </button>
        <button onClick={goNext}  className="p-1.5 rounded hover:bg-cedr-light transition-colors shrink-0">
          <ChevronRight size={16} className="text-cedr-muted" />
        </button>
        <h2 className="text-base font-semibold text-cedr-navy ml-1 truncate">
          {getTitle()}
        </h2>
      </div>

      {/* Centre: mediator badge (clerks + super_admin viewing a mediator) */}
      {showMediatorBadge && (
        <div className="flex items-center gap-2 bg-cedr-light border border-cedr-border rounded px-3 py-1.5 shrink-0">
          <Avatar profile={activeMediatorProfile} size="sm" />
          <div className="text-left">
            <p className="text-xs font-semibold text-cedr-navy leading-tight">
              {activeMediatorProfile.full_name}
            </p>
            <p className="text-[10px] text-cedr-muted leading-tight">Mediator calendar</p>
          </div>
        </div>
      )}

      {/* Right: view toggle */}
      <div className="flex items-center gap-1 bg-cedr-light rounded p-1 shrink-0">
        {['week', 'month'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className={clsx(
              'px-3 py-1 rounded text-sm font-medium transition-colors capitalize',
              view === v ? 'bg-white text-cedr-navy shadow-card' : 'text-cedr-muted hover:text-cedr-text'
            )}>
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}
