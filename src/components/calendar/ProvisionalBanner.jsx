import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Bell, Check, X, ChevronDown, ChevronUp, AlertTriangle, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRespondToBooking } from '../../hooks/useAvailability'
import { useAuth } from '../../lib/auth'
import { useCalendar } from '../../lib/CalendarContext'

function groupBookings(slots) {
  const groups = []
  const byGroupId = {}
  const ungrouped = []

  for (const slot of slots) {
    if (slot.group_id) {
      if (!byGroupId[slot.group_id]) byGroupId[slot.group_id] = []
      byGroupId[slot.group_id].push(slot)
    } else {
      ungrouped.push(slot)
    }
  }

  // group_id groups → one entry per group
  for (const [groupId, groupSlots] of Object.entries(byGroupId)) {
    const sorted = groupSlots.sort((a, b) => a.date.localeCompare(b.date) || a.period.localeCompare(b.period))
    const first  = sorted[0].date
    const last   = sorted[sorted.length - 1].date
    const label  = first === last
      ? `${format(parseISO(first), 'EEE d MMM')} (${sorted.length} slots)`
      : `${format(parseISO(first), 'd MMM')} – ${format(parseISO(last), 'd MMM')} (${sorted.length} slots)`
    groups.push({ key: groupId, date: first, label, slots: sorted, isGroup: true })
  }

  // Ungrouped: group by date (AM+PM same day → Full day)
  const byDate = {}
  for (const slot of ungrouped) {
    if (!byDate[slot.date]) byDate[slot.date] = []
    byDate[slot.date].push(slot)
  }
  for (const [date, daySlots] of Object.entries(byDate)) {
    const am = daySlots.find(s => s.period === 'morning')
    const pm = daySlots.find(s => s.period === 'afternoon')
    if (am && pm) {
      groups.push({ key: `${date}-full`, date, label: `${format(parseISO(date), 'EEE d MMM')} · Full day`, slots: [am, pm], isGroup: false })
    } else {
      const slot = daySlots[0]
      groups.push({ key: slot.id, date, label: `${format(parseISO(date), 'EEE d MMM')} · ${slot.period}`, slots: [slot], isGroup: false })
    }
  }

  return groups.sort((a, b) => a.date.localeCompare(b.date))
}

// Individual row with inline confirmation
function GroupRow({ group, mediatorId, hubspotMediatorId, respond }) {
  const [confirming, setConfirming] = useState(null)
  const { setCurrentDate } = useCalendar()
  const navigate = useNavigate()

  async function handleConfirm() {
    const extraPayload = {
      hubspot_mediator_object_id: hubspotMediatorId || null,
      slot_date:           group.date,
      slot_time:           group.isFullDay ? 'full_day' : group.slots[0].period,
      case_id:             group.slots[0].case_id             || null,
      hubspot_record_id:   group.slots[0].hubspot_record_id   || null,
      hubspot_object_type: group.slots[0].hubspot_object_type || null,
      record_name:         group.slots[0].record_name         || null,
    }
    await Promise.all(
      group.slots.map(slot =>
        respond.mutateAsync({ slotId: slot.id, mediatorId, action: confirming, extraPayload })
      )
    )
    setConfirming(null)
  }

  function handleView() {
    setCurrentDate(parseISO(group.date))
    navigate('/')
  }

  const dateLabel = format(parseISO(group.date), 'EEE d MMM')
  const timeLabel = group.isFullDay ? 'Full day' : group.label

  return (
    <div className="bg-white/10 rounded overflow-hidden">
      {confirming ? (
        <div className="px-3 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle size={13} className="text-white/70 shrink-0" />
            <span>
              {confirming === 'accept' ? 'Confirm acceptance' : 'Confirm decline'} —{' '}
              <span className="font-medium truncate">{group.label}</span>
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
            <span className="text-white/70 ml-2 text-xs">{group.label}</span>
          </div>
          <div className="flex gap-2 ml-4 shrink-0">
            <button onClick={handleView}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors">
              <Eye size={11} /> View
            </button>
            <button onClick={() => setConfirming('decline')}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors">
              <X size={11} /> Decline
            </button>
            <button onClick={() => setConfirming('accept')}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white hover:bg-white/90 text-purple-700 transition-colors">
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
