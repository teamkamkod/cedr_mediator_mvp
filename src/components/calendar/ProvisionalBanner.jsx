import { format, parseISO } from 'date-fns'
import { Bell, Check, X } from 'lucide-react'
import { useRespondToBooking } from '../../hooks/useAvailability'

export default function ProvisionalBanner({ bookings, mediatorId }) {
  const respond = useRespondToBooking()

  if (!bookings?.length) return null

  async function handleAction(slot, action) {
    await respond.mutateAsync({ slotId: slot.id, mediatorId, action })
  }

  return (
    <div className="bg-purple-700 text-white px-6 py-3">
      <div className="flex items-start gap-3">
        <Bell size={16} className="mt-0.5 shrink-0 animate-pulse" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold">
            {bookings.length} provisional booking{bookings.length > 1 ? 's' : ''} need your response
          </p>
          {bookings.map(slot => (
            <div
              key={slot.id}
              className="flex items-center justify-between bg-white/10 rounded px-3 py-2"
            >
              <div className="text-sm">
                <span className="font-medium">
                  {slot.cases?.case_name || `Case #${slot.case_id?.slice(0, 8)}`}
                </span>
                <span className="text-white/70 ml-2 text-xs">
                  {format(parseISO(slot.date), 'EEE d MMM')} · {slot.period}
                </span>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleAction(slot, 'decline')}
                  disabled={respond.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X size={11} /> Decline
                </button>
                <button
                  onClick={() => handleAction(slot, 'accept')}
                  disabled={respond.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white hover:bg-white/90 text-purple-700 transition-colors"
                >
                  <Check size={11} /> Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
