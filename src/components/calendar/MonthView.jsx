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

const CRA_BOOKABLE = ['not_set', 'available']

const statusStyles = {
  available:            'bg-green-50 border-green-200 text-green-800',
  unavailable:          'bg-red-50 border-red-200 text-red-600',
  ask_me:               'bg-amber-50 border-amber-200 text-amber-800',
  provisionally_booked: 'bg-purple-50 border-purple-200 text-purple-800',
  confirmed:            'bg-cyan-50 border-cyan-200 text-cyan-800',
  not_set:              'bg-white border-cedr-border text-cedr-muted/50',
}

const selectedStyle = 'bg-cedr-navy/10 border-cedr-navy ring-1 ring-cedr-navy/30'

function canMerge(am, pm) {
  if (!am || !pm) return false
  if (am.status === 'not_set' || pm.status === 'not_set') return false
  return am.status === pm.status
}

function SlotBar({ slot, period, onClick, selected, selectMode }) {
  const cfg = SLOT_STATUSES[slot.status] || SLOT_STATUSES.not_set
  return (
    <button onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-1 px-1.5 py-1 rounded border transition-all text-left hover:opacity-80',
        selected ? selectedStyle : statusStyles[slot.status],
        selectMode && !selected && 'cursor-cell'
      )}>
      <span className="text-[9px] font-bold uppercase opacity-60 shrink-0">
        {period === 'morning' ? 'AM' : 'PM'}
      </span>
      {slot.status !== 'not_set' && !selected && (
        <span className="text-[10px] font-medium truncate">{cfg.label}</span>
      )}
    </button>
  )
}

function MergedBar({ slot, onClick, selected, selectMode }) {
  const cfg = SLOT_STATUSES[slot.status] || SLOT_STATUSES.not_set
  return (
    <button onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-1 px-1.5 py-2 rounded border transition-all text-left hover:opacity-80',
        selected ? selectedStyle : statusStyles[slot.status],
        selectMode && !selected && 'cursor-cell'
      )}>
      <span className="text-[9px] font-bold uppercase opacity-60 shrink-0">Day</span>
      {slot.status !== 'not_set' && !selected && (
        <span className="text-[10px] font-medium truncate">{cfg.label}</span>
      )}
    </button>
  )
}

export default function MonthView({ currentDate, slots, series, mediatorId, selectMode, selectedSlots, onToggleSlot }) {
  const [popover, setPopover] = useState(null)
  const { isCRA } = useAuth()

  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 })
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  function isSelected(date, period) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return selectedSlots.some(s => s.dateStr === dateStr && s.period === period)
  }

  function handleCellClick(day, period) {
    const dateStr  = format(day, 'yyyy-MM-dd')
    const slotData = resolveSlot(day, period, slots, series)
    if (selectMode) {
      if (isCRA && !CRA_BOOKABLE.includes(slotData.status)) return
      onToggleSlot({ date: day, dateStr, period, slotData })
    } else {
      setPopover({ date: day, period, slotData })
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-b border-cedr-border bg-white sticky top-0 z-10">
        {DAY_HEADERS.map(d => (
          <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-cedr-muted uppercase tracking-wide border-r border-cedr-border last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map(day => {
          const inMonth   = isSameMonth(day, currentDate)
          const dateStr   = format(day, 'yyyy-MM-dd')
          const amSlot    = resolveSlot(day, 'morning',   slots, series)
          const pmSlot    = resolveSlot(day, 'afternoon', slots, series)
          const merged    = !selectMode && canMerge(amSlot, pmSlot)
          const amSel     = isSelected(day, 'morning')
          const pmSel     = isSelected(day, 'afternoon')

          return (
            <div key={day.toISOString()}
              className={clsx(
                'relative min-h-[80px] p-1 pt-0 border-r border-b border-cedr-border last:border-r-0',
                !inMonth && 'bg-cedr-light/40',
              )}>

              {/* Day number — absolute top-left, sits above slots */}
              <span className={clsx(
                'absolute top-1 left-1 z-10 text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full',
                isToday(day)  ? 'bg-cedr-navy text-white' :
                inMonth       ? 'bg-white/80 text-cedr-text' : 'text-cedr-muted/40'
              )}>
                {format(day, 'd')}
              </span>

              {/* Slots — take full height, small top padding for the number */}
              <div className="flex flex-col gap-0.5 mt-6">
                {merged ? (
                  <MergedBar slot={amSlot}
                    onClick={() => handleCellClick(day, 'morning')}
                    selected={amSel} selectMode={selectMode} />
                ) : (
                  <>
                    <SlotBar slot={amSlot} period="morning"
                      onClick={() => handleCellClick(day, 'morning')}
                      selected={amSel} selectMode={selectMode} />
                    <SlotBar slot={pmSlot} period="afternoon"
                      onClick={() => handleCellClick(day, 'afternoon')}
                      selected={pmSel} selectMode={selectMode} />
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {popover && !selectMode && (
        isCRA ? (
          <CRASlotPopover slot={popover.slotData} date={popover.date} period={popover.period}
            mediatorId={mediatorId} onClose={() => setPopover(null)} />
        ) : (
          <SlotPopover slot={popover.slotData} date={popover.date} period={popover.period}
            mediatorId={mediatorId} onClose={() => setPopover(null)} />
        )
      )}
    </div>
  )
}
