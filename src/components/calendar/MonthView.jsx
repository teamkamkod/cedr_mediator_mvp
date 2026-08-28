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

const statusStyles = {
  available:            'bg-green-50 border-green-200 text-green-800',
  unavailable:          'bg-red-50 border-red-200 text-red-600',
  ask_me:               'bg-amber-50 border-amber-200 text-amber-800',
  provisionally_booked: 'bg-purple-50 border-purple-200 text-purple-800',
  confirmed:            'bg-cyan-50 border-cyan-200 text-cyan-800',
  not_set:              'bg-white border-cedr-border text-cedr-muted/50',
}

function canMerge(am, pm) {
  if (!am || !pm) return false
  if (am.status === 'not_set' || pm.status === 'not_set') return false
  return am.status === pm.status
}

function SlotBar({ slot, period, onClick }) {
  const cfg = SLOT_STATUSES[slot.status] || SLOT_STATUSES.not_set
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-1 px-1.5 py-1 rounded border transition-all text-left hover:opacity-80',
        statusStyles[slot.status]
      )}
    >
      <span className="text-[9px] font-bold uppercase opacity-60 shrink-0">
        {period === 'morning' ? 'AM' : 'PM'}
      </span>
      {slot.status !== 'not_set' && (
        <span className="text-[10px] font-medium truncate">{cfg.label}</span>
      )}
    </button>
  )
}

function MergedBar({ slot, onClick }) {
  const cfg = SLOT_STATUSES[slot.status] || SLOT_STATUSES.not_set
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-1 px-1.5 py-2 rounded border transition-all text-left hover:opacity-80',
        statusStyles[slot.status]
      )}
    >
      <span className="text-[9px] font-bold uppercase opacity-60 shrink-0">Day</span>
      {slot.status !== 'not_set' && (
        <span className="text-[10px] font-medium truncate">{cfg.label}</span>
      )}
    </button>
  )
}

export default function MonthView({ currentDate, slots, series, mediatorId }) {
  const [popover, setPopover] = useState(null)
  const { isCRA } = useAuth()

  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 })
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  function openPopover(date, period) {
    const slotData = resolveSlot(date, period, slots, series)
    setPopover({ date, period, slotData })
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
          const amSlot    = resolveSlot(day, 'morning',   slots, series)
          const pmSlot    = resolveSlot(day, 'afternoon', slots, series)
          const merged    = canMerge(amSlot, pmSlot)

          return (
            <div
              key={day.toISOString()}
              className={clsx(
                'min-h-[90px] p-1.5 border-r border-b border-cedr-border last:border-r-0 flex flex-col gap-1',
                !inMonth && 'bg-cedr-light/40',
              )}
            >
              <div className="mb-0.5">
                <span className={clsx(
                  'text-xs font-semibold w-7 h-7 flex items-center justify-center rounded-full',
                  isToday(day)  ? 'bg-cedr-navy text-white' :
                  inMonth       ? 'text-cedr-text' : 'text-cedr-muted/40'
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              {merged ? (
                <MergedBar
                  slot={amSlot}
                  onClick={() => openPopover(day, 'morning')}
                />
              ) : (
                <>
                  <SlotBar slot={amSlot} period="morning"   onClick={() => openPopover(day, 'morning')} />
                  <SlotBar slot={pmSlot} period="afternoon" onClick={() => openPopover(day, 'afternoon')} />
                </>
              )}
            </div>
          )
        })}
      </div>

      {popover && (
        isCRA ? (
          <CRASlotPopover
            slot={popover.slotData}
            date={popover.date}
            period={popover.period}
            mediatorId={mediatorId}
            onClose={() => setPopover(null)}
          />
        ) : (
          <SlotPopover
            slot={popover.slotData}
            date={popover.date}
            period={popover.period}
            mediatorId={mediatorId}
            onClose={() => setPopover(null)}
          />
        )
      )}
    </div>
  )
}
