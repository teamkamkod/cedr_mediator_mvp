import { useState } from 'react'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday, isSameDay } from 'date-fns'
import { clsx } from 'clsx'
import SlotCell from './SlotCell'
import SlotPopover from './SlotPopover'
import { resolveSlot } from '../../hooks/useAvailability'

export default function WeekView({ currentDate, slots, series, mediatorId }) {
  const [popover, setPopover] = useState(null) // { date, period, slotData }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(currentDate, { weekStartsOn: 1 })
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd })

  function openPopover(date, period) {
    const slotData = resolveSlot(date, period, slots, series)
    setPopover({ date, period, slotData })
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-cedr-border bg-white sticky top-0 z-10">
        {days.map(day => (
          <div
            key={day.toISOString()}
            className={clsx(
              'py-3 px-2 text-center border-r border-cedr-border last:border-r-0',
            )}
          >
            <p className="text-[11px] font-medium text-cedr-muted uppercase tracking-wide">
              {format(day, 'EEE')}
            </p>
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-1',
              isToday(day) ? 'bg-cedr-navy text-white' : 'text-cedr-text'
            )}>
              <p className={clsx('text-sm font-semibold')}>
                {format(day, 'd')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Slot grid */}
      <div className="grid grid-cols-7">
        {days.map(day => (
          <div
            key={day.toISOString()}
            className={clsx(
              'border-r border-cedr-border last:border-r-0 p-1.5 space-y-1',
              isToday(day) && 'bg-cedr-navy/[0.02]'
            )}
          >
            {['morning', 'afternoon'].map(period => {
              const slotData = resolveSlot(day, period, slots, series)
              return (
                <SlotCell
                  key={period}
                  slotData={slotData}
                  period={period}
                  onClick={() => openPopover(day, period)}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Popover */}
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
