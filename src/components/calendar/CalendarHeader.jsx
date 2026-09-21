import { format, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, formatDistanceToNow, differenceInDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Bell, MousePointerClick, CalendarDays, Users, CalendarRange } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../../lib/auth'
import { useLastCalendarUpdate } from '../../hooks/useAvailability'
import { Avatar } from '../layout/AppLayout'

function LastUpdateBadge({ mediatorId }) {
  const { data: lastUpdate, isLoading } = useLastCalendarUpdate(mediatorId)

  if (isLoading) return null

  if (!lastUpdate) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-semibold bg-red-100 text-red-700 border-red-200 shrink-0">
        Never updated
      </span>
    )
  }

  const days  = differenceInDays(new Date(), lastUpdate)
  const label = formatDistanceToNow(lastUpdate, { addSuffix: true })

  const style = days < 7
    ? 'bg-green-100 text-green-700 border-green-200'
    : days < 30
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-red-100 text-red-700 border-red-200'

  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-semibold shrink-0', style)}
      title={lastUpdate.toLocaleString()}>
      Last update: {label}
    </span>
  )
}

export default function CalendarHeader({
  view, setView, currentDate, setCurrentDate,
  onRequestUpdate, selectMode, onToggleSelectMode, selectedCount,
  showWeekends, onToggleWeekends, onManageClerks, onSetPeriod,
}) {
  const { activeMediatorProfile, isSuperAdmin, isCRA } = useAuth()

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

  const showCTA = (isSuperAdmin || isCRA) && activeMediatorProfile

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-cedr-border">

      {/* Left: view toggle + select */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 bg-cedr-light rounded p-1">
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
        <button onClick={onToggleSelectMode} title={selectMode ? 'Exit select mode (Esc)' : 'Select multiple slots'}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-all',
            selectMode
              ? 'bg-cedr-navy text-white border-cedr-navy'
              : 'border-cedr-border text-cedr-muted hover:border-cedr-navy/30 hover:text-cedr-navy'
          )}>
          <MousePointerClick size={13} />
          {selectMode ? selectedCount > 0 ? `${selectedCount} selected` : 'Selecting…' : 'Select'}
        </button>
        <button onClick={onSetPeriod} title="Set status for a date range"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border border-cedr-border text-cedr-muted hover:border-cedr-navy/30 hover:text-cedr-navy transition-all">
          <CalendarRange size={13} />
          Set period
        </button>
      </div>

      {/* Centre: nav */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <button onClick={goToday} className="btn-secondary text-xs px-3 py-1.5 shrink-0">Today</button>
        <button onClick={goPrev}  className="p-1.5 rounded hover:bg-cedr-light transition-colors shrink-0">
          <ChevronLeft size={16} className="text-cedr-muted" />
        </button>
        <button onClick={goNext}  className="p-1.5 rounded hover:bg-cedr-light transition-colors shrink-0">
          <ChevronRight size={16} className="text-cedr-muted" />
        </button>
        <h2 className="text-base font-semibold text-cedr-navy truncate ml-1">{getTitle()}</h2>
      </div>

      {/* Right: mediator badge + request update + weekends toggle */}
      <div className="flex items-center gap-3 shrink-0">
        {showCTA && activeMediatorProfile && (
          <div className="flex items-center gap-2 bg-cedr-light border border-cedr-border rounded px-3 py-1.5">
            <Avatar profile={activeMediatorProfile} size="sm" />
            <div>
              <p className="text-xs font-semibold text-cedr-navy leading-tight">{activeMediatorProfile.full_name}</p>
              <p className="text-[10px] text-cedr-muted leading-tight">Mediator calendar</p>
            </div>
            {isCRA && <LastUpdateBadge mediatorId={activeMediatorProfile.id} />}
          </div>
        )}
        {showCTA && (
          <button onClick={onRequestUpdate} className="flex items-center gap-1.5 btn-secondary text-xs px-3 py-1.5 shrink-0">
            <Bell size={12} />
            Request update
          </button>
        )}
        {isCRA && activeMediatorProfile && (
          <button onClick={onManageClerks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-cedr-border text-cedr-muted hover:border-cedr-navy/30 hover:text-cedr-navy transition-all shrink-0">
            <Users size={12} />
            Manage clerks
          </button>
        )}

        {/* Weekends toggle — far right */}
        <button onClick={onToggleWeekends} title={showWeekends ? 'Hide weekends' : 'Show weekends'}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-all shrink-0',
            !showWeekends
              ? 'bg-cedr-navy text-white border-cedr-navy'
              : 'border-cedr-border text-cedr-muted hover:border-cedr-navy/30 hover:text-cedr-navy'
          )}>
          <CalendarDays size={12} />
          {showWeekends ? 'Mon–Sun' : 'Mon–Fri'}
        </button>
      </div>
    </div>
  )
}
