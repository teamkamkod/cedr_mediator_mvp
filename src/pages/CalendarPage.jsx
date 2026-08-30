import { useState, useCallback, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, addDays } from 'date-fns'
import { useAuth } from '../lib/auth'
import { useCalendar } from '../lib/CalendarContext'
import { useSlots, useRecurringSeries } from '../hooks/useAvailability'
import CalendarHeader      from '../components/calendar/CalendarHeader'
import WeekView            from '../components/calendar/WeekView'
import MonthView           from '../components/calendar/MonthView'
import MediatorPicker      from '../components/calendar/MediatorPicker'
import RequestUpdateModal  from '../components/calendar/RequestUpdateModal'
import FloatingActionBar   from '../components/calendar/FloatingActionBar'
import BatchStatusPopover  from '../components/calendar/BatchStatusPopover'
import CRABatchPopover     from '../components/calendar/CRABatchPopover'
import { SLOT_STATUSES }   from '../lib/constants'

export default function CalendarPage() {
  const { activeMediatorId, activeMediatorProfile, isCRA } = useAuth()
  const { currentDate, setCurrentDate, view, setView, showWeekends, setShowWeekends } = useCalendar()

  const [showUpdateModal,  setShowUpdateModal]  = useState(false)
  const [selectMode,       setSelectMode]       = useState(false)
  const [selectedSlots,    setSelectedSlots]    = useState([])
  const [showBatchPopover, setShowBatchPopover] = useState(false)

  const mediatorId = activeMediatorId

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

  function toggleSelectMode() {
    if (selectMode) exitSelect()
    else { setSelectMode(true); setSelectedSlots([]) }
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

  const { data: slots,  isLoading: slotsLoading }  = useSlots(mediatorId, dateFrom, dateTo)
  const { data: series, isLoading: seriesLoading } = useRecurringSeries(mediatorId)
  const isLoading = slotsLoading || seriesLoading

  if (!mediatorId) {
    return <div className="flex flex-col h-screen"><MediatorPicker /></div>
  }

  return (
    <div className="flex flex-col h-screen">
      <CalendarHeader
        view={view} setView={setView}
        currentDate={currentDate} setCurrentDate={setCurrentDate}
        onRequestUpdate={() => setShowUpdateModal(true)}
        selectMode={selectMode}
        onToggleSelectMode={toggleSelectMode}
        selectedCount={selectedSlots.length}
        showWeekends={showWeekends}
        onToggleWeekends={() => setShowWeekends(!showWeekends)}
      />

      <div className="flex items-center gap-4 px-6 py-2 bg-white border-b border-cedr-border">
        {Object.entries(SLOT_STATUSES).filter(([k]) => k !== 'not_set').map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
            <span className="text-xs text-cedr-muted">{meta.label}</span>
          </div>
        ))}
        {selectMode && (
          <span className="ml-auto text-xs text-cedr-teal font-medium">
            Select mode — click slots to select · Esc to exit
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'week' ? (
        <WeekView
          currentDate={currentDate} slots={slots} series={series} mediatorId={mediatorId}
          selectMode={selectMode} selectedSlots={selectedSlots} onToggleSlot={toggleSlot}
          showWeekends={showWeekends}
        />
      ) : (
        <MonthView
          currentDate={currentDate} slots={slots} series={series} mediatorId={mediatorId}
          selectMode={selectMode} selectedSlots={selectedSlots} onToggleSlot={toggleSlot}
          showWeekends={showWeekends}
        />
      )}

      {selectMode && selectedSlots.length > 0 && (
        <FloatingActionBar
          selectedSlots={selectedSlots}
          onClear={() => setSelectedSlots([])}
          onAction={() => setShowBatchPopover(true)}
        />
      )}

      {showBatchPopover && !isCRA && (
        <BatchStatusPopover selectedSlots={selectedSlots} mediatorId={mediatorId}
          onClose={() => setShowBatchPopover(false)} onDone={exitSelect} />
      )}
      {showBatchPopover && isCRA && (
        <CRABatchPopover selectedSlots={selectedSlots} mediatorId={mediatorId}
          onClose={() => setShowBatchPopover(false)} onDone={exitSelect} />
      )}
      {showUpdateModal && (
        <RequestUpdateModal
          mediatorName={activeMediatorProfile?.full_name}
          hubspotMediatorId={activeMediatorProfile?.hubspot_mediator_object_id}
          mediatorId={mediatorId}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </div>
  )
}
