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
      <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold bg-red-100 text-red-700 border-red-200 shrink-0">
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
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold shrink-0', style)}
      title={lastUpdate.toLocaleString()}>
      {label}
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
  function goPrev()  { setCurrentDate(p => view === 'week' ? subWeeks(p, 1) : subMonths(p, 1)) }
  function goNext()  { setCurrentDate(p => view === 'week' ? addWeeks(p, 1) : addMonths(p, 1)) }

  function getTitle() {
    if (view === 'week') {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 })
      const e = endOfWeek(currentDate,   { weekStartsOn: 1 })
      if (format(s, 'MMM yyyy') === format(e, 'MMM yyyy'))
        return `${format(s, 'MMM d')} – ${format(e, 'd, yyyy')}`
      return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
    }
    return format(currentDate, 'MMMM yyyy')
  }

  const showCTA = (isSuperAdmin || isCRA) && activeMediatorProfile

  return (
    <div className="bg-white border-b border-cedr-border">

      {/* ── Line 1: Navigation ── */}
      <div className="flex items-center gap-2 px-4 py-2">
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-cedr-light rounded p-1 shrink-0">
          {['week', 'month'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={clsx(
                'px-3 py-1 rounded text-xs font-medium transition-colors capitalize',
                view === v ? 'bg-white text-cedr-navy shadow-card' : 'text-cedr-muted hover:text-cedr-text'
              )}>
              {v}
            </button>
          ))}
        </div>

        {/* Nav */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={goPrev} className="p-1.5 rounded hover:bg-cedr-light transition-colors">
            <ChevronLeft size={15} className="text-cedr-muted" />
          </button>
          <button onClick={goToday} className="btn-secondary text-xs px-3 py-1.5">Today</button>
          <button onClick={goNext} className="p-1.5 rounded hover:bg-cedr-light transition-colors">
            <ChevronRight size={15} className="text-cedr-muted" />
          </button>
        </div>

        {/* Title */}
        <h2 className="text-sm font-semibold text-cedr-navy truncate flex-1 ml-1">{getTitle()}</h2>

        {/* Weekends toggle — far right of line 1 */}
        <button onClick={onToggleWeekends}
          title={showWeekends ? 'Hide weekends' : 'Show weekends'}
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

      {/* ── Line 2: Actions ── */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-t border-cedr-border/50 bg-cedr-light/40">
        {/* Left: slot actions */}
        <button onClick={onToggleSelectMode}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-all shrink-0',
            selectMode
              ? 'bg-cedr-navy text-white border-cedr-navy'
              : 'border-cedr-border text-cedr-muted hover:border-cedr-navy/30 hover:text-cedr-navy'
          )}>
          <MousePointerClick size={12} />
          {selectMode
            ? (selectedCount > 0 ? `${selectedCount} selected` : 'Selecting…')
            : 'Select'}
        </button>

        <button onClick={onSetPeriod}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-cedr-border text-cedr-muted hover:border-cedr-navy/30 hover:text-cedr-navy transition-all shrink-0">
          <CalendarRange size={12} />
          Set period
        </button>

        <div className="flex-1" />

        {/* Right: mediator context + CRA actions */}
        {showCTA && activeMediatorProfile && (
          <div className="flex items-center gap-1.5 bg-white border border-cedr-border rounded px-2.5 py-1 shrink-0">
            <Avatar profile={activeMediatorProfile} size="sm" />
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold text-cedr-navy leading-tight">{activeMediatorProfile.full_name}</p>
            </div>
            {isCRA && <LastUpdateBadge mediatorId={activeMediatorProfile.id} />}
          </div>
        )}

        {showCTA && (
          <button onClick={onRequestUpdate}
            className="flex items-center gap-1.5 btn-secondary text-xs px-3 py-1.5 shrink-0">
            <Bell size={11} />
            <span className="hidden sm:inline">Request update</span>
            <span className="sm:hidden">Update</span>
          </button>
        )}

        {isCRA && activeMediatorProfile && (
          <button onClick={onManageClerks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-cedr-border text-cedr-muted hover:border-cedr-navy/30 hover:text-cedr-navy transition-all shrink-0">
            <Users size={12} />
            <span className="hidden sm:inline">Manage clerks</span>
            <span className="sm:hidden">Clerks</span>
          </button>
        )}
      </div>
    </div>
  )
}
