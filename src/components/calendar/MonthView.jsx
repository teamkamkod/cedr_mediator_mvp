import { useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isToday, isSameMonth
} from 'date-fns'
import { clsx } from 'clsx'
import SlotPopover from './SlotPopover'
import CRASlotPopover from './CRASlotPopover'
import { resolveSlot } from '../../hooks/useAvailability'
import { SLOT_STATUSES } from '../../lib/constants'
import { useAuth } from '../../lib/auth'
import { isPastDate } from '../../lib/dateUtils'

const CRA_BOOKABLE = ['not_set', 'available']
const selectedStyle = 'bg-cedr-navy/10 border-cedr-navy ring-1 ring-cedr-navy/30'

const statusStyles = {
  available:            'bg-green-50 text-green-800',
  unavailable:          'bg-red-50 text-red-600',
  ask_me:               'bg-amber-50 text-amber-800',
  provisionally_booked: 'bg-purple-50 text-purple-800',
  confirmed:            'bg-cyan-50 text-cyan-800',
  not_set:              'bg-white text-cedr-muted/50',
}

function canMerge(am, pm) {
  if (!am || !pm) return false
  if (am.status === 'not_set' || pm.status === 'not_set') return false
  return am.status === pm.status
}

function SlotBar({ slot, period, onClick, selected, past }) {
  const cfg = SLOT_STATUSES[slot.status] || SLOT_STATUSES.not_set
  return (
    <div className="relative flex-1">
      <button onClick={onClick}
        className={clsx(
          'w-full h-full flex items-center gap-1 px-1.5 border-b last:border-b-0 border-white/30 transition-all text-left hover:opacity-80',
          selected ? selectedStyle : statusStyles[slot.status],
        )}>
        <span className="text-[9px] font-bold uppercase opacity-60 shrink-0">
          {period === 'morning' ? 'AM' : 'PM'}
        </span>
        {slot.status !== 'not_set' && !selected && (
          <span className="text-[10px] font-medium truncate">{cfg.label}</span>
        )}
      </button>
      {past && <div className="absolute inset-0 bg-gray-400/25 pointer-events-none" />}
    </div>
  )
}

function MergedBar({ slot, onClick, selected, past }) {
  const cfg = SLOT_STATUSES[slot.status] || SLOT_STATUSES.not_set
  return (
    <div className="relative flex-1">
      <button onClick={onClick}
        className={clsx(
          'w-full h-full flex items-center gap-1 px-1.5 transition-all text-left hover:opacity-80',
          selected ? selectedStyle : statusStyles[slot.status],
        )}>
        <span className="text-[9px] font-bold uppercase opacity-60 shrink-0">Day</span>
        {slot.status !== 'not_set' && !selected && (
          <span className="text-[10px] font-medium truncate">{cfg.label}</span>
        )}
      </button>
      {past && <div className="absolute inset-0 bg-gray-400/25 pointer-events-none" />}
    </div>
  )
}

export default function MonthView({ currentDate, slots, series, mediatorId, selectMode, selectedSlots, onToggleSlot, showWeekends }) {
  const [popover, setPopover] = useState(null)
  const { isCRA } = useAuth()

  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 })
  let   allDays    = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const DAY_HEADERS = showWeekends
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const colCount = showWeekends ? 7 : 5

  // For month grid: group into rows of 7, then filter each row
  // Simpler: filter all days to remove weekends, then render in colCount grid
  const days = showWeekends
    ? allDays
    : allDays.filter(d => d.getDay() !== 0 && d.getDay() !== 6)

  function isSelected(date, period) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return selectedSlots.some(s => s.dateStr === dateStr && s.period === period)
  }

  function handleCellClick(day, period) {
    const dateStr  = format(day, 'yyyy-MM-dd')
    const slotData = resolveSlot(day, period, slots, series)
    const past     = isPastDate(day)

    if (selectMode) {
      if (past) return
      if (isCRA && !CRA_BOOKABLE.includes(slotData.status)) return
      onToggleSlot({ date: day, dateStr, period, slotData })
      return
    }

    if (past) {
      if (slotData.status === 'not_set') return
      setPopover({ date: day, period, slotData, readOnly: true })
      return
    }

    setPopover({ date: day, period, slotData, readOnly: false })
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className={`grid border-b border-cedr-border bg-white sticky top-0 z-10`}
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
        {DAY_HEADERS.map(d => (
          <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-cedr-muted uppercase tracking-wide border-r border-cedr-border last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
        {days.map(day => {
          const inMonth   = isSameMonth(day, currentDate)
          const amSlot    = resolveSlot(day, 'morning',   slots, series)
          const pmSlot    = resolveSlot(day, 'afternoon', slots, series)
          const merged    = !selectMode && canMerge(amSlot, pmSlot)
          const amSel     = isSelected(day, 'morning')
          const pmSel     = isSelected(day, 'afternoon')
          const past      = isPastDate(day)

          return (
            <div key={day.toISOString()}
              className={clsx(
                'relative min-h-[100px] border-r border-b border-cedr-border last:border-r-0 overflow-hidden',
                !inMonth && 'bg-cedr-light/40',
              )}>

              {/* Day number — top-right overlay */}
              <span className={clsx(
                'absolute top-1 right-1 z-10 text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full pointer-events-none',
                isToday(day)  ? 'bg-cedr-navy text-white' :
                inMonth       ? 'bg-white/80 text-cedr-text backdrop-blur-sm' : 'text-cedr-muted/40'
              )}>
                {format(day, 'd')}
              </span>

              {/* Slots — fill full height */}
              <div className="flex flex-col h-full">
                {merged ? (
                  <MergedBar slot={amSlot}
                    onClick={() => handleCellClick(day, 'morning')}
                    selected={amSel} past={past} />
                ) : (
                  <>
                    <SlotBar slot={amSlot} period="morning"
                      onClick={() => handleCellClick(day, 'morning')}
                      selected={amSel} past={past} />
                    <SlotBar slot={pmSlot} period="afternoon"
                      onClick={() => handleCellClick(day, 'afternoon')}
                      selected={pmSel} past={past} />
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {popover && (
        isCRA ? (
          <CRASlotPopover slot={popover.slotData} date={popover.date} period={popover.period}
            mediatorId={mediatorId} readOnly={popover.readOnly} onClose={() => setPopover(null)} />
        ) : (
          <SlotPopover slot={popover.slotData} date={popover.date} period={popover.period}
            mediatorId={mediatorId} readOnly={popover.readOnly} onClose={() => setPopover(null)} />
        )
      )}
    </div>
  )
}
