import { useState } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, addDays } from 'date-fns'
import { useAuth } from '../lib/auth'
import { useSlots, useRecurringSeries, useProvisionalBookings } from '../hooks/useAvailability'
import CalendarHeader from '../components/calendar/CalendarHeader'
import WeekView from '../components/calendar/WeekView'
import MonthView from '../components/calendar/MonthView'
import ProvisionalBanner from '../components/calendar/ProvisionalBanner'
import { SLOT_STATUSES } from '../lib/constants'

export default function CalendarPage() {
  const { profile } = useAuth()
  const [view, setView]               = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  const mediatorId = profile?.id

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
  const { data: provisional }                       = useProvisionalBookings(mediatorId)

  const isLoading = slotsLoading || seriesLoading

  return (
    <div className="flex flex-col h-screen">
      <ProvisionalBanner bookings={provisional} mediatorId={mediatorId} />

      <CalendarHeader
        view={view}
        setView={setView}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      />

      <div className="flex items-center gap-4 px-6 py-2 bg-white border-b border-cedr-border">
        {Object.entries(SLOT_STATUSES).filter(([k]) => k !== 'not_set').map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
            <span className="text-xs text-cedr-muted">{meta.label}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'week' ? (
        <WeekView
          currentDate={currentDate}
          slots={slots}
          series={series}
          mediatorId={mediatorId}
        />
      ) : (
        <MonthView
          currentDate={currentDate}
          slots={slots}
          series={series}
          mediatorId={mediatorId}
        />
      )}
    </div>
  )
}
