import { useState } from 'react'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday } from 'date-fns'
import { clsx } from 'clsx'
import SlotCell from './SlotCell'
import SlotPopover from './SlotPopover'
import CRASlotPopover from './CRASlotPopover'
import { resolveSlot } from '../../hooks/useAvailability'
import { SLOT_STATUSES } from '../../lib/constants'
import { useAuth } from '../../lib/auth'

// Two slots are mergeable when both have the same non-empty status
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
  not_set:              'bg-white border-cedr-border text-cedr-muted/50 hover:bg-cedr-light',
}

function MergedSlotCell({ slotData, day, onClick }) {
  const { status, notes, cases } = slotData
  const meta = SLOT_STATUSES[status] || SLOT_STATUSES.not_set
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex flex-col gap-1 px-3 py-3 border rounded transition-all text-left',
        statusStyles[status],
        'min-h-[188px]' // ~2× single slot height (2 × 90 + gap)
      )}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">Full day</span>
      {status !== 'not_set' && (
        <span className="text-sm font-semibold leading-tight">
          {['provisionally_booked', 'confirmed'].includes(status) && cases?.case_name
            ? cases.case_name
            : meta.label}
        </span>
      )}
      {notes && (
        <span className="text-xs opacity-70 mt-auto leading-tight">{notes}</span>
      )}
    </button>
  )
}

export default function WeekView({ currentDate, slots, series, mediatorId }) {
  const [popover, setPopover] = useState(null)
  const { isCRA } = useAuth()

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(currentDate,   { weekStartsOn: 1 })
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
          <div key={day.toISOString()} className="py-3 px-3 text-center border-r border-cedr-border last:border-r-0">
            <p className="text-[11px] font-semibold text-cedr-muted uppercase tracking-wide">
              {format(day, 'EEE')}
            </p>
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
      <div className="grid grid-cols-7">
        {days.map(day => {
          const amSlot = resolveSlot(day, 'morning',   slots, series)
          const pmSlot = resolveSlot(day, 'afternoon', slots, series)
          const merged = canMerge(amSlot, pmSlot)

          return (
            <div
              key={day.toISOString()}
              className={clsx(
                'border-r border-cedr-border last:border-r-0 p-2',
                !merged && 'space-y-2',
                isToday(day) && 'bg-cedr-navy/[0.02]'
              )}
            >
              {merged ? (
                <MergedSlotCell
                  slotData={amSlot}
                  day={day}
                  onClick={() => openPopover(day, 'morning')}
                />
              ) : (
                <>
                  <SlotCell slotData={amSlot} period="morning"   onClick={() => openPopover(day, 'morning')} />
                  <SlotCell slotData={pmSlot} period="afternoon" onClick={() => openPopover(day, 'afternoon')} />
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
