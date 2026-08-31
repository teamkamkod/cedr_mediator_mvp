import { format, parseISO } from 'date-fns'
import { Check, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useCalendar } from '../../lib/CalendarContext'

export default function BookingConfirmModal({ booking, onClose }) {
  const { mediator, slots } = booking
  const sorted = [...slots].sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.period.localeCompare(b.period))

  const { setActiveMediatorId } = useAuth()
  const { setCurrentDate }      = useCalendar()
  const navigate                = useNavigate()

  function handleViewCalendar() {
    // Set the CRA's active mediator to the booked one
    setActiveMediatorId(mediator.id)
    // Focus the calendar on the first booked slot's date
    if (sorted.length > 0) setCurrentDate(parseISO(sorted[0].dateStr))
    navigate('/')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-lg border border-cedr-border w-full max-w-sm overflow-hidden">
        <div className="bg-purple-600 px-6 py-5 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={22} />
          </div>
          <p className="text-base font-semibold">Provisional booking confirmed</p>
          <p className="text-sm text-white/70 mt-1">{mediator.full_name}</p>
        </div>

        <div className="p-5 space-y-2">
          <p className="text-xs font-semibold text-cedr-muted uppercase tracking-wide mb-3">
            Booked slots
          </p>
          {sorted.map(s => (
            <div key={`${s.dateStr}-${s.period}`}
              className="flex items-center gap-3 px-3 py-2 bg-purple-50 border border-purple-200 rounded">
              <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <span className="text-sm font-medium text-purple-800">
                {format(parseISO(s.dateStr), 'EEE d MMM')}
              </span>
              <span className="text-xs text-purple-600 ml-auto font-medium uppercase">
                {s.period === 'morning' ? 'AM' : 'PM'}
              </span>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <button onClick={handleViewCalendar}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2">
            <Calendar size={14} />
            View {mediator.full_name}'s calendar
          </button>
        </div>
      </div>
    </div>
  )
}
