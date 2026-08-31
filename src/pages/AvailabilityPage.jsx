import { useState, useMemo } from 'react'
import { format, addWeeks, subWeeks, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { clsx } from 'clsx'
import { useQueryClient } from '@tanstack/react-query'
import { useCalendar } from '../lib/CalendarContext'
import { useAllMediators, useAllSeries, useGlobalSlots } from '../hooks/useGlobalAvailability'
import GlobalWeekView       from '../components/availability/GlobalWeekView'
import SlotAggregatePopover from '../components/availability/SlotAggregatePopover'
import MediatorDrawer       from '../components/availability/MediatorDrawer'
import BookingConfirmModal  from '../components/availability/BookingConfirmModal'

export default function AvailabilityPage() {
  const { showWeekends } = useCalendar()
  const queryClient      = useQueryClient()

  const [currentDate,   setCurrentDate]   = useState(new Date())
  const [showWithNoData, setShowWithNoData] = useState(false)
  const [selectedSlots, setSelectedSlots]  = useState([]) // {dateStr, period}
  const [popover,        setPopover]        = useState(null) // {date, period}
  const [drawer,         setDrawer]         = useState(null) // {mediator, preselectedSlots}
  const [bookingConfirm, setBookingConfirm] = useState(null)

  const { data: mediators = [], isLoading: loadingMediators } = useAllMediators()
  const mediatorIds = useMemo(() => mediators.map(m => m.id), [mediators])

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(currentDate,   { weekStartsOn: 1 })
  const dateFrom  = format(weekStart, 'yyyy-MM-dd')
  const dateTo    = format(weekEnd,   'yyyy-MM-dd')

  const { data: allSlots  = [], isLoading: loadingSlots }  = useGlobalSlots(mediatorIds, dateFrom, dateTo)
  const { data: allSeries = [], isLoading: loadingSeries } = useAllSeries(mediatorIds)
  const isLoading = loadingMediators || loadingSlots || loadingSeries

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

  const visibleMediators = useMemo(() => {
    if (showWithNoData) return mediators
    return mediators.filter(m =>
      (slotsByMediator[m.id]?.length > 0) || (seriesByMediator[m.id]?.length > 0)
    )
  }, [mediators, slotsByMediator, seriesByMediator, showWithNoData])

  function toggleSelectedSlot(dateStr, period) {
    setSelectedSlots(prev => {
      const exists = prev.some(s => s.dateStr === dateStr && s.period === period)
      if (exists) return prev.filter(s => !(s.dateStr === dateStr && s.period === period))
      return [...prev, { dateStr, period }]
    })
  }

  function handleCellClick(date, period) {
    setPopover({ date, period })
  }

  function handleViewMediator(mediator) {
    const preselected = selectedSlots.length > 0
      ? selectedSlots.map(s => ({ date: parseISO(s.dateStr), dateStr: s.dateStr, period: s.period, slotData: {} }))
      : [{ date: popover.date, dateStr: format(popover.date, 'yyyy-MM-dd'), period: popover.period, slotData: {} }]

    const initialDate = selectedSlots.length > 0
      ? parseISO(selectedSlots[0].dateStr)
      : popover?.date

    setPopover(null)
    setDrawer({ mediator, initialDate, preselectedSlots: preselected })
  }

  function handleBookingCreated(details) {
    setDrawer(null)
    setSelectedSlots([])
    setBookingConfirm(details)
  }

  function handleConfirmClose() {
    queryClient.invalidateQueries({ queryKey: ['global-slots'] })
    setBookingConfirm(null)
  }

  const weekLabel = `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`

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
        <span className="text-xs text-cedr-muted">
          {visibleMediators.length} mediator{visibleMediators.length !== 1 ? 's' : ''}
        </span>
        {selectedSlots.length > 0 && (
          <span className="text-xs font-semibold text-cedr-navy bg-cedr-light border border-cedr-border px-3 py-1.5 rounded">
            {selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''} selected
          </span>
        )}
        <button onClick={() => setShowWithNoData(v => !v)}
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

      {/* Legend */}
      <div className="flex items-center gap-6 px-6 py-2 bg-white border-b border-cedr-border shrink-0">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-200 border border-green-300" /><span className="text-xs text-cedr-muted">Availability</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-50  border border-green-200" /><span className="text-xs text-cedr-muted">Potential</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-50    border border-red-200"   /><span className="text-xs text-cedr-muted">No availability</span></div>
        <span className="text-xs text-cedr-muted ml-2">— Check slots to filter by selection, then click a cell to see available mediators</span>
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
          selectedSlots={selectedSlots}
          onToggleSelectedSlot={toggleSelectedSlot}
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
          selectedSlots={selectedSlots}
          onClose={() => setPopover(null)}
          onViewMediator={handleViewMediator}
        />
      )}

      {/* Drawer */}
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
        <BookingConfirmModal booking={bookingConfirm} onClose={handleConfirmClose} />
      )}
    </div>
  )
}
