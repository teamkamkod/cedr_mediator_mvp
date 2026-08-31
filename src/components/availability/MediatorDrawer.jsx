import { useState, useCallback, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, addDays } from 'date-fns'
import { ArrowLeft, MousePointerClick } from 'lucide-react'
import { clsx } from 'clsx'
import { useCalendar } from '../../lib/CalendarContext'
import { useSlots, useRecurringSeries } from '../../hooks/useAvailability'
import { useAuth } from '../../lib/auth'
import WeekView          from '../calendar/WeekView'
import MonthView         from '../calendar/MonthView'
import CRABatchPopover   from '../calendar/CRABatchPopover'
import FloatingActionBar from '../calendar/FloatingActionBar'
import { SLOT_STATUSES } from '../../lib/constants'
import { Avatar } from '../layout/AppLayout'

export default function MediatorDrawer({ mediator, initialDate, preselectedSlots = [], onBack, onBookingCreated }) {
  const { showWeekends }        = useCalendar()
  const { isCRA, isSuperAdmin } = useAuth()
  const canBook = isCRA || isSuperAdmin

  const [view,        setView]        = useState('week')
  const [currentDate, setCurrentDate] = useState(initialDate || new Date())

  // highlightedSlots: pre-selected from availability search — shown with ring border, status color intact
  const [highlightedSlots, setHighlightedSlots] = useState(preselectedSlots)

  // selectMode: CRA/admin can also manually add more slots
  const [selectMode,    setSelectMode]    = useState(false)
  const [selectedSlots, setSelectedSlots] = useState([])
  const [showBatchPopover, setShowBatchPopover] = useState(false)

  // Which set of slots to book: highlighted (from availability search) or manually selected
  const [bookingSource, setBookingSource] = useState(null) // 'highlighted' | 'selected'

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') { if (selectMode) exitSelect(); else onBack() } }
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

  function openBooking(source) {
    setBookingSource(source)
    setShowBatchPopover(true)
  }

  function handleBookingDone(details) {
    exitSelect()
    setShowBatchPopover(false)
    setHighlightedSlots([])
    setBookingSource(null)
    if (details && onBookingCreated) {
      onBookingCreated({ mediatorName: mediator.full_name, slots: details.slots || [] })
    }
  }

  const slotsForBooking = bookingSource === 'highlighted' ? highlightedSlots : selectedSlots

  return (
    <div className="absolute inset-0 bg-white z-30 flex flex-col">
      {/* Drawer header */}
      <div className="flex items-center gap-4 px-6 py-3 bg-cedr-navy text-white border-b border-white/10 shrink-0 flex-wrap gap-y-2">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm font-medium shrink-0">
          <ArrowLeft size={15} />
          Back to list
        </button>
        <div className="w-px h-4 bg-white/20 shrink-0" />
        <div className="flex items-center gap-2">
          <Avatar profile={mediator} size="sm" />
          <p className="text-sm font-semibold">{mediator.full_name}</p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white/10 rounded p-1 ml-2">
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

        {/* Nav */}
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentDate(d => { const nd = new Date(d); view === 'week' ? nd.setDate(nd.getDate()-7) : nd.setMonth(nd.getMonth()-1); return nd })}
            className="px-2.5 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-white transition-colors">← Prev</button>
          <button onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-white transition-colors">Today</button>
          <button onClick={() => setCurrentDate(d => { const nd = new Date(d); view === 'week' ? nd.setDate(nd.getDate()+7) : nd.setMonth(nd.getMonth()+1); return nd })}
            className="px-2.5 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-white transition-colors">Next →</button>
        </div>

        <div className="flex-1" />

        {/* Book highlighted slots CTA */}
        {canBook && highlightedSlots.length > 0 && (
          <button onClick={() => openBooking('highlighted')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-purple-500 hover:bg-purple-400 text-white transition-colors shrink-0">
            Book {highlightedSlots.length} highlighted slot{highlightedSlots.length > 1 ? 's' : ''}
          </button>
        )}

        {/* Select mode toggle */}
        {canBook && (
          <button onClick={() => selectMode ? exitSelect() : setSelectMode(true)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-all shrink-0',
              selectMode ? 'bg-white text-cedr-navy border-white' : 'border-white/30 text-white/70 hover:text-white hover:bg-white/10'
            )}>
            <MousePointerClick size={12} />
            {selectMode ? selectedSlots.length > 0 ? `${selectedSlots.length} selected` : 'Selecting…' : 'Select'}
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
        {highlightedSlots.length > 0 && (
          <span className="ml-auto text-xs text-cedr-navy font-medium">
            {highlightedSlots.length} slot{highlightedSlots.length > 1 ? 's' : ''} pre-selected from search
          </span>
        )}
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === 'week' ? (
          <WeekView
            currentDate={currentDate} slots={slots || []} series={series || []}
            mediatorId={mediator.id}
            selectMode={selectMode} selectedSlots={selectedSlots} onToggleSlot={toggleSlot}
            showWeekends={showWeekends}
            highlightedSlots={highlightedSlots}
            onAnyClick={highlightedSlots.length > 0 && !selectMode ? () => openBooking('highlighted') : null}
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

      {/* Floating action bar for manually selected slots */}
      {selectMode && selectedSlots.length > 0 && (
        <FloatingActionBar
          selectedSlots={selectedSlots}
          onClear={() => setSelectedSlots([])}
          onAction={() => openBooking('selected')}
        />
      )}

      {/* CRA/admin batch booking popover */}
      {showBatchPopover && canBook && (
        <CRABatchPopover
          selectedSlots={slotsForBooking}
          mediatorId={mediator.id}
          mediatorOverride={mediator}
          onClose={() => { setShowBatchPopover(false); setBookingSource(null) }}
          onDone={handleBookingDone}
        />
      )}
    </div>
  )
}
