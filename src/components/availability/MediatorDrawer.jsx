import { useState, useCallback, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, addDays } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'
import { useCalendar } from '../../lib/CalendarContext'
import { useSlots, useRecurringSeries } from '../../hooks/useAvailability'
import { useAuth } from '../../lib/auth'
import WeekView          from '../calendar/WeekView'
import MonthView         from '../calendar/MonthView'
import CRABatchPopover   from '../calendar/CRABatchPopover'
import CRASlotPopover    from '../calendar/CRASlotPopover'
import SlotPopover       from '../calendar/SlotPopover'
import FloatingActionBar from '../calendar/FloatingActionBar'
import { SLOT_STATUSES } from '../../lib/constants'
import { Avatar } from '../layout/AppLayout'

export default function MediatorDrawer({ mediator, initialDate, preselectedSlots = [], onBack, onBookingCreated }) {
  const { showWeekends } = useCalendar()
  const { isCRA }        = useAuth()

  const [view,        setView]        = useState('week')
  const [currentDate, setCurrentDate] = useState(initialDate || new Date())
  const [selectedSlots, setSelectedSlots] = useState(preselectedSlots)
  const [showBatchPopover, setShowBatchPopover] = useState(false)
  const [singlePopover,    setSinglePopover]    = useState(null)
  const [selectMode,       setSelectMode]       = useState(preselectedSlots.length > 0)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && selectMode) exitSelect() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectMode])

  function exitSelect() {
    setSelectMode(false)
    setSelectedSlots([])
    setShowBatchPopover(false)
  }

  const toggleSlot = useCallback(({ date, dateStr, period, slotData }) => {
    setSelectedSlots(prev => {
      const exists = prev.find(s => s.dateStr === dateStr && s.period === period)
      if (exists) return prev.filter(s => !(s.dateStr === dateStr && s.period === period))
      return [...prev, { date, dateStr, period, slotData }]
    })
  }, [])

  const dateFrom = format(
    view === 'week'
      ? subDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 1)
      : subDays(startOfMonth(currentDate), 7),
    'yyyy-MM-dd'
  )
  const dateTo = format(
    view === 'week'
      ? addDays(endOfWeek(currentDate, { weekStartsOn: 1 }), 1)
      : addDays(endOfMonth(currentDate), 7),
    'yyyy-MM-dd'
  )

  const { data: slots  } = useSlots(mediator.id, dateFrom, dateTo)
  const { data: series } = useRecurringSeries(mediator.id)

  function handleBookingDone(details) {
    exitSelect()
    setShowBatchPopover(false)
    setSinglePopover(null)
    if (details && onBookingCreated) {
      onBookingCreated({ mediatorName: mediator.full_name, slots: details.slots || [] })
    }
  }

  return (
    <div className="absolute inset-0 bg-white z-30 flex flex-col">
      {/* Drawer header */}
      <div className="flex items-center gap-4 px-6 py-3 bg-cedr-navy text-white border-b border-white/10 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft size={15} />
          Back to list
        </button>
        <div className="w-px h-4 bg-white/20" />
        <div className="flex items-center gap-2">
          <Avatar profile={mediator} size="sm" />
          <p className="text-sm font-semibold">{mediator.full_name}</p>
        </div>
        <div className="flex items-center gap-1 bg-white/10 rounded p-1 ml-4">
          {['week', 'month'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={clsx(
                'px-3 py-1 rounded text-xs font-medium transition-colors capitalize',
                view === v ? 'bg-white text-cedr-navy' : 'text-white/60 hover:text-white'
              )}>
              {v}
            </button>
          ))}
        </div>
        {selectMode ? (
          <button onClick={exitSelect}
            className="ml-2 px-3 py-1.5 rounded text-xs font-medium bg-white/20 hover:bg-white/30 text-white transition-colors">
            ✕ Exit select
          </button>
        ) : (
          <button onClick={() => setSelectMode(true)}
            className="ml-2 px-3 py-1.5 rounded text-xs font-medium border border-white/30 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
            Select slots
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 bg-white border-b border-cedr-border shrink-0">
        {Object.entries(SLOT_STATUSES).filter(([k]) => k !== 'not_set').map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
            <span className="text-xs text-cedr-muted">{meta.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar view */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Nav */}
        <div className="flex items-center gap-2 px-6 py-2 bg-white border-b border-cedr-border shrink-0">
          <button onClick={() => setCurrentDate(d => {
            const nd = new Date(d)
            view === 'week' ? nd.setDate(nd.getDate() - 7) : nd.setMonth(nd.getMonth() - 1)
            return nd
          })} className="btn-secondary text-xs px-3 py-1">← Prev</button>
          <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-xs px-3 py-1">Today</button>
          <button onClick={() => setCurrentDate(d => {
            const nd = new Date(d)
            view === 'week' ? nd.setDate(nd.getDate() + 7) : nd.setMonth(nd.getMonth() + 1)
            return nd
          })} className="btn-secondary text-xs px-3 py-1">Next →</button>
        </div>

        {view === 'week' ? (
          <WeekView
            currentDate={currentDate} slots={slots || []} series={series || []}
            mediatorId={mediator.id}
            selectMode={selectMode} selectedSlots={selectedSlots} onToggleSlot={toggleSlot}
            showWeekends={showWeekends}
          />
        ) : (
          <MonthView
            currentDate={currentDate} slots={slots || []} series={series || []}
            mediatorId={mediator.id}
            selectMode={selectMode} selectedSlots={selectedSlots} onToggleSlot={toggleSlot}
            showWeekends={showWeekends}
          />
        )}
      </div>

      {/* Floating action bar */}
      {selectMode && selectedSlots.length > 0 && (
        <FloatingActionBar
          selectedSlots={selectedSlots}
          onClear={() => setSelectedSlots([])}
          onAction={() => setShowBatchPopover(true)}
        />
      )}

      {/* Batch popover */}
      {showBatchPopover && isCRA && (
        <CRABatchPopover
          selectedSlots={selectedSlots}
          mediatorId={mediator.id}
          onClose={() => setShowBatchPopover(false)}
          onDone={handleBookingDone}
        />
      )}
      {showBatchPopover && !isCRA && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-black/20"
          onClick={() => setShowBatchPopover(false)}>
          <div className="bg-white rounded-xl p-5 text-sm text-cedr-muted">
            Batch status setting not available in this view.
          </div>
        </div>
      )}

      {/* Single slot popover — opened by WeekView/MonthView click */}
      {singlePopover && (
        isCRA ? (
          <CRASlotPopover slot={singlePopover.slotData} date={singlePopover.date}
            period={singlePopover.period} mediatorId={mediator.id}
            readOnly={singlePopover.readOnly}
            onClose={() => setSinglePopover(null)} />
        ) : (
          <SlotPopover slot={singlePopover.slotData} date={singlePopover.date}
            period={singlePopover.period} mediatorId={mediator.id}
            readOnly={singlePopover.readOnly}
            onClose={() => setSinglePopover(null)} />
        )
      )}
    </div>
  )
}
