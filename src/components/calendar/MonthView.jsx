import { useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isToday, isSameMonth, getDay
} from 'date-fns'
import { clsx } from 'clsx'
import SlotCell from './SlotCell'
import SlotPopover from './SlotPopover'
import { resolveSlot } from '../../hooks/useAvailability'
import { SLOT_STATUSES } from '../../lib/constants'

export default function MonthView({ currentDate, slots, series, mediatorId }) {
  const [popover, setPopover] = useState(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  function openPopover(date, period) {
    const slotData = resolveSlot(date, period, slots, series)
    setPopover({ date, period, slotData })
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-cedr-border bg-white sticky top-0">
        {DAY_HEADERS.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-medium text-cedr-muted uppercase tracking-wide border-r border-cedr-border last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const inMonth = isSameMonth(day, currentDate)
          const morningSlot   = resolveSlot(day, 'morning', slots, series)
          const afternoonSlot = resolveSlot(day, 'afternoon', slots, series)

          return (
            <div
              key={day.toISOString()}
              className={clsx(
                'min-h-[80px] p-1.5 border-r border-b border-cedr-border last:border-r-0',
                !inMonth && 'bg-cedr-light/50',
              )}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1.5">
                <span className={clsx(
                  'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
                  isToday(day)  ? 'bg-cedr-navy text-white' :
                  inMonth       ? 'text-cedr-text' : 'text-cedr-muted/40'
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* AM/PM compact indicators */}
              <div className="space-y-0.5">
                <SlotCell
                  slotData={morningSlot}
                  period="morning"
                  onClick={() => openPopover(day, 'morning')}
                  compact
                />
                <SlotCell
                  slotData={afternoonSlot}
                  period="afternoon"
                  onClick={() => openPopover(day, 'afternoon')}
                  compact
                />
              </div>
            </div>
          )
        })}
      </div>

      {popover && (
        <SlotPopover
          slot={popover.slotData}
          date={popover.date}
          period={popover.period}
          mediatorId={mediatorId}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  )
}
