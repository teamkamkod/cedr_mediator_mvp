import { useState, useMemo } from 'react'
import { format, addWeeks, subWeeks, parseISO, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { clsx } from 'clsx'
import { useCalendar } from '../lib/CalendarContext'
import { useAllMediators, useAllSeries, useGlobalSlots } from '../hooks/useGlobalAvailability'
import GlobalWeekView    from '../components/availability/GlobalWeekView'
import SlotAggregatePopover from '../components/availability/SlotAggregatePopover'
import MediatorDrawer    from '../components/availability/MediatorDrawer'
import DateRangeFilter   from '../components/availability/DateRangeFilter'
import BookingConfirmModal from '../components/availability/BookingConfirmModal'

// Build array of {dateStr, period} for a range, excluding weekends
function buildRangeSlots(start, end) {
  if (!start?.dateStr || !end?.dateStr || start.dateStr > end.dateStr) return []
  const slots = []
  let current = parseISO(start.dateStr)
  const endDate = parseISO(end.dateStr)

  while (current <= endDate) {
    const day     = current.getDay()
    const dateStr = format(current, 'yyyy-MM-dd')
    const isFirst = dateStr === start.dateStr
    const isLast  = dateStr === end.dateStr

    if (day !== 0 && day !== 6) {
      const periods = []
      if (isFirst && isLast) {
        if (start.period === 'morning')   periods.push('morning')
        if (end.period   === 'afternoon') periods.push('afternoon')
        if (start.period === 'afternoon') periods.push('afternoon')
      } else if (isFirst) {
        if (start.period === 'morning') periods.push('morning', 'afternoon')
        else periods.push('afternoon')
      } else if (isLast) {
        if (end.period === 'afternoon') periods.push('morning', 'afternoon')
        else periods.push('morning')
      } else {
        periods.push('morning', 'afternoon')
      }
      periods.forEach(p => slots.push({ dateStr, period: p }))
    }
    current = addDays(current, 1)
  }
  return slots
}

export default function AvailabilityPage() {
  const { showWeekends } = useCalendar()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showWithNoData, setShowWithNoData] = useState(false)
  const [rangeStart, setRangeStart] = useState(null)
  const [rangeEnd,   setRangeEnd]   = useState(null)
  const [popover,    setPopover]     = useState(null) // { date, period }
  const [drawer,     setDrawer]      = useState(null) // { mediator, preselectedSlots }
  const [bookingConfirm, setBookingConfirm] = useState(null)

  const { data: mediators = [], isLoading: loadingMediators } = useAllMediators()

  const mediatorIds = useMemo(() => mediators.map(m => m.id), [mediators])

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(currentDate, { weekStartsOn: 1 })
  const dateFrom  = format(weekStart, 'yyyy-MM-dd')
  const dateTo    = format(weekEnd, 'yyyy-MM-dd')

  const { data: allSlots  = [], isLoading: loadingSlots }  = useGlobalSlots(mediatorIds, dateFrom, dateTo)
  const { data: allSeries = [], isLoading: loadingSeries } = useAllSeries(mediatorIds)

  const isLoading = loadingMediators || loadingSlots || loadingSeries

  // Index slots and series by mediator_id for fast lookup
  const slotsByMediator = useMemo(() => {
    const map = {}
    for (const s of allSlots) {
      if (!map[s.mediator_id]) map[s.mediator_id] = []
      map[s.mediator_id].push(s)
    }
    return map
  }, [allSlots])

  const seriesByMediator = useMemo(() => {
    const map = {}
    for (const s of allSeries) {
      if (!map[s.mediator_id]) map[s.mediator_id] = []
      map[s.mediator_id].push(s)
    }
    return map
  }, [allSeries])

  // Filter mediators with no data if toggle is off
  const visibleMediators = useMemo(() => {
    if (showWithNoData) return mediators
    return mediators.filter(m =>
      (slotsByMediator[m.id]?.length > 0) || (seriesByMediator[m.id]?.length > 0)
    )
  }, [mediators, slotsByMediator, seriesByMediator, showWithNoData])

  const rangeSlots = useMemo(() => buildRangeSlots(rangeStart, rangeEnd), [rangeStart, rangeEnd])
  const rangeValid = rangeStart?.dateStr && rangeEnd?.dateStr && rangeStart.dateStr <= rangeEnd.dateStr

  function handleRangeChange(key, value) {
    if (key === 'start') setRangeStart(value)
    else setRangeEnd(value)
  }

  function handleCellClick(date, period) {
    setPopover({ date, period })
  }

  function handleViewMediator(mediator) {
    const preselected = rangeValid
      ? rangeSlots.map(s => ({ date: parseISO(s.dateStr), dateStr: s.dateStr, period: s.period, slotData: {} }))
      : [{ date: popover.date, dateStr: format(popover.date, 'yyyy-MM-dd'), period: popover.period, slotData: {} }]

    setPopover(null)
    setDrawer({ mediator, initialDate: popover?.date || parseISO(rangeSlots[0]?.dateStr), preselectedSlots: preselected })
  }

  function handleBookingCreated(details) {
    setDrawer(null)
    setBookingConfirm(details)
  }

  const weekLabel = (() => {
    const s = format(weekStart, 'd MMM')
    const e = format(weekEnd, 'd MMM yyyy')
    return `${s} – ${e}`
  })()

  return (
    <div className="flex flex-col h-screen relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-cedr-border shrink-0">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setCurrentDate(d => subWeeks(d, 1))} className="p-1.5 rounded hover:bg-cedr-light transition-colors">
            <ChevronLeft size={16} className="text-cedr-muted" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-xs px-3 py-1.5">Today</button>
          <button onClick={() => setCurrentDate(d => addWeeks(d, 1))} className="p-1.5 rounded hover:bg-cedr-light transition-colors">
            <ChevronRight size={16} className="text-cedr-muted" />
          </button>
          <h2 className="text-base font-semibold text-cedr-navy ml-2">{weekLabel}</h2>
        </div>

        <div className="flex-1" />

        {/* Mediator count */}
        <span className="text-xs text-cedr-muted">
          {visibleMediators.length} mediator{visibleMediators.length !== 1 ? 's' : ''}
        </span>

        {/* Show/hide no-data mediators */}
        <button
          onClick={() => setShowWithNoData(v => !v)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-all',
            showWithNoData
              ? 'bg-cedr-navy text-white border-cedr-navy'
              : 'border-cedr-border text-cedr-muted hover:border-cedr-navy/30 hover:text-cedr-navy'
          )}>
          {showWithNoData ? <Eye size={12} /> : <EyeOff size={12} />}
          {showWithNoData ? 'Showing all' : 'Hide no-data'}
        </button>
      </div>

      {/* Date range filter */}
      <DateRangeFilter
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onChange={handleRangeChange}
        onClear={() => { setRangeStart(null); setRangeEnd(null) }}
      />

      {/* Legend */}
      <div className="flex items-center gap-6 px-6 py-2 bg-white border-b border-cedr-border shrink-0">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-200 border border-green-300" /><span className="text-xs text-cedr-muted">Availability</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-50  border border-green-200" /><span className="text-xs text-cedr-muted">Potential</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-50    border border-red-200"   /><span className="text-xs text-cedr-muted">No availability</span></div>
        {rangeValid && <span className="ml-auto text-xs text-cedr-teal font-medium">📌 Range filter active — {rangeSlots.length} slot{rangeSlots.length !== 1 ? 's' : ''}</span>}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-cedr-muted">Loading availability…</p>
          </div>
        </div>
      ) : visibleMediators.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-cedr-muted">
          <p className="text-sm">No mediators with availability data in this period.</p>
        </div>
      ) : (
        <GlobalWeekView
          currentDate={currentDate}
          mediators={visibleMediators}
          slotsByMediator={slotsByMediator}
          seriesByMediator={seriesByMediator}
          showWeekends={showWeekends}
          rangeSlots={rangeValid ? rangeSlots : []}
          onCellClick={handleCellClick}
        />
      )}

      {/* Popover */}
      {popover && !drawer && (
        <SlotAggregatePopover
          date={popover.date}
          period={popover.period}
          mediators={visibleMediators}
          slotsByMediator={slotsByMediator}
          seriesByMediator={seriesByMediator}
          rangeSlots={rangeValid ? rangeSlots : []}
          onClose={() => setPopover(null)}
          onViewMediator={handleViewMediator}
        />
      )}

      {/* Mediator drawer */}
      {drawer && (
        <MediatorDrawer
          mediator={drawer.mediator}
          initialDate={drawer.initialDate}
          preselectedSlots={drawer.preselectedSlots}
          onBack={() => { setDrawer(null); setPopover(popover) }}
          onBookingCreated={handleBookingCreated}
        />
      )}

      {/* Booking confirmation */}
      {bookingConfirm && (
        <BookingConfirmModal
          booking={bookingConfirm}
          onClose={() => setBookingConfirm(null)}
        />
      )}
    </div>
  )
}
