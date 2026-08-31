import { useState } from 'react'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday } from 'date-fns'
import { clsx } from 'clsx'
import SlotCell from './SlotCell'
import SlotPopover from './SlotPopover'
import CRASlotPopover from './CRASlotPopover'
import { resolveSlot } from '../../hooks/useAvailability'
import { SLOT_STATUSES } from '../../lib/constants'
import { useAuth } from '../../lib/auth'
import { isPastDate } from '../../lib/dateUtils'

const CRA_BOOKABLE = ['not_set', 'available']

function canMerge(am, pm) {
  if (!am || !pm) return false
  if (am.status === 'not_set' || pm.status === 'not_set') return false
  return am.status === pm.status
}

const statusStyles = {
  available:            'bg-green-50 border-green-200 text-green-800 hover:bg-green-100',
  unavailable:          'bg-red-50 border-red-200 text-red-600 hover:bg-red-100',
  ask_me:               'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
  provisionally_booked: 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100',
  confirmed:            'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100',
  not_set:              'bg-white border-cedr-border text-cedr-muted/50 hover:bg-cedr-light hover:border-cedr-muted/30',
}

function MergedSlotCell({ slotData, onClick, selected, selectMode, past }) {
  const { status } = slotData
  const meta = SLOT_STATUSES[status] || SLOT_STATUSES.not_set
  const selectedStyle = 'bg-cedr-navy/10 border-cedr-navy ring-2 ring-cedr-navy/30 text-cedr-navy'
  return (
    <div className="relative min-h-[188px]">
      <button onClick={onClick}
        className={clsx(
          'w-full h-full flex flex-col gap-1 px-3 py-3 border rounded transition-all text-left',
          selected ? selectedStyle : statusStyles[status],
          'min-h-[188px]',
          selectMode && !selected && 'cursor-cell hover:ring-2 hover:ring-cedr-navy/20'
        )}>
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">Full day</span>
        {status !== 'not_set' && !selected && (
          <span className="text-sm font-semibold leading-tight">{meta.label}</span>
        )}
      </button>
      {past && <div className="absolute inset-0 bg-gray-400/25 rounded pointer-events-none" />}
    </div>
  )
}

export default function WeekView({ currentDate, slots, series, mediatorId, selectMode, selectedSlots, onToggleSlot, showWeekends, highlightedSlots = [], onAnyClick = null }) {
  const [popover, setPopover] = useState(null)
  const { isCRA } = useAuth()

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(currentDate,   { weekStartsOn: 1 })
  let   days      = eachDayOfInterval({ start: weekStart, end: weekEnd })
  if (!showWeekends) days = days.filter(d => d.getDay() !== 0 && d.getDay() !== 6)

  const colCount = days.length

  function isSelected(date, period) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return selectedSlots.some(s => s.dateStr === dateStr && s.period === period)
  }

  function isHighlighted(date, period) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return highlightedSlots.some(s => s.dateStr === dateStr && s.period === period)
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

    // If a custom click handler is provided (e.g. drawer with pre-selection), use it
    if (onAnyClick) {
      onAnyClick()
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
      <div className={`grid grid-cols-${colCount} border-b border-cedr-border bg-white sticky top-0 z-10`}
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
        {days.map(day => (
          <div key={day.toISOString()} className="py-3 px-3 text-center border-r border-cedr-border last:border-r-0">
            <p className="text-[11px] font-semibold text-cedr-muted uppercase tracking-wide">{format(day, 'EEE')}</p>
            <div className={clsx(
              'w-9 h-9 rounded-full flex items-center justify-center mx-auto mt-1.5',
              isToday(day) ? 'bg-cedr-navy text-white' : 'text-cedr-text'
            )}>
              <p className="text-base font-bold">{format(day, 'd')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Slot grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
        {days.map(day => {
          const amSlot = resolveSlot(day, 'morning',   slots, series)
          const pmSlot = resolveSlot(day, 'afternoon', slots, series)
          const merged = !selectMode && canMerge(amSlot, pmSlot)
          const amSel  = isSelected(day, 'morning')
          const pmSel  = isSelected(day, 'afternoon')
          const past   = isPastDate(day)
          const amHigh = isHighlighted(day, 'morning')
          const pmHigh = isHighlighted(day, 'afternoon')

          return (
            <div key={day.toISOString()}
              className={clsx(
                'border-r border-cedr-border last:border-r-0 p-2',
                !merged && 'space-y-2',
                isToday(day) && 'bg-cedr-navy/[0.02]'
              )}>
              {merged ? (
                <MergedSlotCell slotData={amSlot}
                  onClick={() => handleCellClick(day, 'morning')}
                  selected={amSel} selectMode={selectMode} past={past} />
              ) : (
                <>
                  <SlotCell slotData={amSlot} period="morning"
                    onClick={() => handleCellClick(day, 'morning')}
                    selectMode={selectMode} selected={amSel} past={past} highlighted={amHigh} />
                  <SlotCell slotData={pmSlot} period="afternoon"
                    onClick={() => handleCellClick(day, 'afternoon')}
                    selectMode={selectMode} selected={pmSel} past={past} highlighted={pmHigh} />
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty week hint */}
      {!selectMode && days.every(day =>
        resolveSlot(day, 'morning',   slots, series).status === 'not_set' &&
        resolveSlot(day, 'afternoon', slots, series).status === 'not_set'
      ) && (
        <div className="flex flex-col items-center justify-center py-12 text-cedr-muted gap-2">
          <p className="text-sm font-medium">No availability set for this week</p>
          <p className="text-xs">Click any AM or PM slot to get started</p>
        </div>
      )}

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
