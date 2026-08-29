import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Bell, Check, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { useRespondToBooking } from '../../hooks/useAvailability'
import { useAuth } from '../../lib/auth'

function groupBookings(slots) {
  const byDate = {}
  for (const slot of slots) {
    if (!byDate[slot.date]) byDate[slot.date] = []
    byDate[slot.date].push(slot)
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySlots]) => {
      const am = daySlots.find(s => s.period === 'morning')
      const pm = daySlots.find(s => s.period === 'afternoon')
      if (am && pm) {
        return { key: `${date}-full`, date, label: 'Full day', slots: [am, pm], isFullDay: true }
      }
      return { key: daySlots[0].id, date, label: daySlots[0].period, slots: [daySlots[0]], isFullDay: false }
    })
}

// Individual row with inline confirmation
function GroupRow({ group, mediatorId, hubspotMediatorId, respond }) {
  const [confirming, setConfirming] = useState(null)

  async function handleConfirm() {
    const extraPayload = {
      hubspot_mediator_object_id: hubspotMediatorId || null,
      slot_date:   group.date,
      slot_time:   group.isFullDay ? 'full_day' : group.slots[0].period,
      case_id:     group.slots[0].case_id || null,
    }
    await Promise.all(
      group.slots.map(slot =>
        respond.mutateAsync({ slotId: slot.id, mediatorId, action: confirming, extraPayload })
      )
    )
    setConfirming(null)
  }

  const dateLabel = format(parseISO(group.date), 'EEE d MMM')
  const timeLabel = group.isFullDay ? 'Full day' : group.label

  return (
    <div className="bg-white/10 rounded overflow-hidden">
      {confirming ? (
        // Confirmation step
        <div className="px-3 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle size={13} className="text-white/70 shrink-0" />
            <span>
              {confirming === 'accept' ? 'Confirm acceptance' : 'Confirm decline'} —{' '}
              <span className="font-medium">{dateLabel}</span>
              <span className="text-white/70"> · {timeLabel}</span>
            </span>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setConfirming(null)}
              className="px-2.5 py-1 rounded text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={respond.isPending}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                confirming === 'accept'
                  ? 'bg-white text-purple-700 hover:bg-white/90'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {respond.isPending ? '…' : confirming === 'accept' ? 'Accept' : 'Decline'}
            </button>
          </div>
        </div>
      ) : (
        // Default row
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">
              {group.slots[0].case_id
                ? `Case #${group.slots[0].case_id.slice(0, 8)}`
                : 'Mediation request'}
            </span>
            <span className="text-white/70 ml-2 text-xs">
              {dateLabel} · {timeLabel}
            </span>
          </div>
          <div className="flex gap-2 ml-4 shrink-0">
            <button
              onClick={() => setConfirming('decline')}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X size={11} /> Decline
            </button>
            <button
              onClick={() => setConfirming('accept')}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white hover:bg-white/90 text-purple-700 transition-colors"
            >
              <Check size={11} /> Accept
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProvisionalBanner({ bookings, mediatorId }) {
  const [open,      setOpen]      = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const respond = useRespondToBooking()
  const { isMediator, isClerk, activeMediatorProfile } = useAuth()
  const hubspotMediatorId = activeMediatorProfile?.hubspot_mediator_object_id

  if (!bookings?.length || (!isMediator && !isClerk) || dismissed) return null

  const groups = groupBookings(bookings)

  return (
    <div className="bg-purple-700 text-white shrink-0">
      {/* Collapsed header */}
      <div className="flex items-center justify-between px-6 py-2.5">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-sm font-semibold hover:text-white/80 transition-colors"
        >
          <Bell size={14} className={open ? '' : 'animate-pulse'} />
          {groups.length} provisional request{groups.length > 1 ? 's' : ''} pending
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          title="Dismiss until next visit"
        >
          <X size={14} />
        </button>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="px-6 pb-3 space-y-1.5 border-t border-white/20 pt-2">
          {groups.map(group => (
            <GroupRow
              key={group.key}
              group={group}
              mediatorId={mediatorId}
              hubspotMediatorId={hubspotMediatorId}
              respond={respond}
            />
          ))}
        </div>
      )}
    </div>
  )
}
