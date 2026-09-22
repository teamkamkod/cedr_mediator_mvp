import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Bell, Check, X, ChevronDown, ChevronUp, AlertTriangle, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRespondToBooking } from '../../hooks/useAvailability'
import { useAuth } from '../../lib/auth'
import { useCalendar } from '../../lib/CalendarContext'
import DealInfoModal from '../common/DealInfoModal'
import InfoBadge from '../common/InfoBadge'

// ─── Data helpers ────────────────────────────────────────────

function buildCaseGroups(slots) {
  if (!slots?.length) return []

  // 1. Group slots into mediation-date buckets (by group_id, or date for solos)
  const bucketMap = {}
  for (const slot of slots) {
    const key = slot.group_id || `${slot.date}-${slot.period}`
    if (!bucketMap[key]) bucketMap[key] = []
    bucketMap[key].push(slot)
  }

  // 2. Build a mediation-date object per bucket
  const dates = Object.entries(bucketMap).map(([key, ss]) => {
    const sorted  = [...ss].sort((a, b) => a.period.localeCompare(b.period))
    const hasAM   = sorted.some(s => s.period === 'morning')
    const hasPM   = sorted.some(s => s.period === 'afternoon')
    const isFullDay = hasAM && hasPM
    return {
      key,
      group_id:            sorted[0].group_id || null,
      date:                sorted[0].date,
      isFullDay,
      period:              isFullDay ? null : sorted[0].period,
      slots:               sorted,
      case_id:             sorted[0].case_id            || null,
      record_name:         sorted[0].record_name        || null,
      hubspot_record_id:   sorted[0].hubspot_record_id  || null,
      hubspot_object_type: sorted[0].hubspot_object_type|| null,
    }
  })

  // 3. Group by case_id
  const caseMap = {}
  for (const d of dates) {
    const ck = d.case_id || '__no_case'
    if (!caseMap[ck]) {
      caseMap[ck] = {
        case_id:             d.case_id,
        record_name:         d.record_name,
        hubspot_record_id:   d.hubspot_record_id,
        hubspot_object_type: d.hubspot_object_type,
        dates:               [],
      }
    }
    caseMap[ck].dates.push(d)
  }

  // 4. Sort dates within each case, then cases by earliest date
  return Object.values(caseMap)
    .map(c => ({ ...c, dates: c.dates.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => a.dates[0].date.localeCompare(b.dates[0].date))
}

// ─── DateRow — one row per mediation date ────────────────────

function DateRow({ d, mediatorId, hubspotMediatorId, respond }) {
  const [confirming,  setConfirming]  = useState(null)
  const [conflictErr, setConflictErr] = useState(false)
  const { setCurrentDate } = useCalendar()
  const navigate = useNavigate()

  const dateLabel   = format(parseISO(d.date), 'EEE d MMM')
  const periodLabel = d.isFullDay ? 'Full day' : d.period === 'morning' ? 'AM' : 'PM'

  function handleView() {
    setCurrentDate(parseISO(d.date))
    navigate('/')
  }

  async function handleConfirm() {
    const extraPayload = {
      hubspot_mediator_object_id: hubspotMediatorId || null,
      slot_date:           d.date,
      slot_time:           d.isFullDay ? 'full_day' : d.period,
      case_id:             d.case_id             || null,
      group_id:            d.group_id            || null,
      hubspot_record_id:   d.hubspot_record_id   || null,
      hubspot_object_type: d.hubspot_object_type || null,
      record_name:         d.record_name         || null,
    }
    try {
      await Promise.all(
        d.slots.map(slot =>
          respond.mutateAsync({ slotId: slot.id, mediatorId, action: confirming, extraPayload })
        )
      )
      setConfirming(null)
    } catch (err) {
      if (err?.message === 'CASE_CONFLICT') { setConflictErr(true); setConfirming(null) }
    }
  }

  // — Conflict state
  if (conflictErr) return (
    <div className="flex items-center gap-2 pl-4 pr-3 py-2 border-l-2 border-red-400 bg-red-950/20">
      <AlertTriangle size={11} className="text-red-300 shrink-0" />
      <p className="text-xs text-red-200 flex-1">A date is already pending for this case.</p>
      <button onClick={() => setConflictErr(false)} className="text-red-300 hover:text-white ml-1">
        <X size={11} />
      </button>
    </div>
  )

  // — Confirming state
  if (confirming) return (
    <div className="flex items-center gap-2 pl-4 pr-3 py-2 border-l-2 border-white/30 bg-white/5">
      <AlertTriangle size={11} className="text-white/60 shrink-0" />
      <span className="text-xs text-white/90 flex-1">
        {confirming === 'accept' ? 'Accept' : 'Decline'}{' '}
        <span className="font-semibold">{dateLabel} · {periodLabel}</span>?
      </span>
      <button onClick={() => setConfirming(null)}
        className="px-2 py-0.5 rounded text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-colors">
        Cancel
      </button>
      <button onClick={handleConfirm} disabled={respond.isPending}
        className={`px-2.5 py-0.5 rounded text-xs font-semibold transition-colors disabled:opacity-50 ${
          confirming === 'accept'
            ? 'bg-white text-purple-800 hover:bg-white/90'
            : 'bg-red-500 text-white hover:bg-red-400'
        }`}>
        {respond.isPending ? '…' : confirming === 'accept' ? 'Accept' : 'Decline'}
      </button>
    </div>
  )

  // — Default row
  return (
    <div className="flex items-center gap-2 pl-4 pr-3 py-2 border-l-2 border-purple-400/40 hover:bg-white/5 transition-colors">
      <span className="text-sm font-medium text-white flex-1">{dateLabel}</span>
      <span className="text-xs text-purple-300 mr-1">{periodLabel}</span>
      <div className="flex gap-1 shrink-0">
        <button onClick={handleView}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-white/70 bg-white/10 hover:bg-white/20 transition-colors">
          <Eye size={10} />View
        </button>
        <button onClick={() => setConfirming('decline')}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-white/70 bg-white/10 hover:bg-white/20 transition-colors">
          <X size={10} />Decline
        </button>
        <button onClick={() => setConfirming('accept')}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-white text-purple-800 hover:bg-white/90 transition-colors">
          <Check size={10} />Accept
        </button>
      </div>
    </div>
  )
}

// ─── CaseSection — groups dates under a case header ──────────

function CaseSection({ caseGroup, mediatorId, hubspotMediatorId, respond }) {
  const [dealModal, setDealModal] = useState(false)
  const count = caseGroup.dates.length

  return (
    <div className="rounded-lg overflow-hidden border border-white/15">
      {/* Case header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/10">
        <div className="w-2 h-2 rounded-full bg-purple-300 shrink-0" />
        <span className="text-sm font-semibold text-white truncate flex-1">
          {caseGroup.record_name || `Case ${caseGroup.case_id?.slice(0, 8) || '—'}`}
        </span>
        {caseGroup.hubspot_record_id && (
          <InfoBadge
            recordId={caseGroup.hubspot_record_id}
            recordName={caseGroup.record_name}
            onInfoClick={() => setDealModal(true)}
          />
        )}
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/15 text-white/80 shrink-0">
          {count} date{count > 1 ? 's' : ''}
        </span>
      </div>

      {/* Date rows */}
      <div className="divide-y divide-white/10">
        {caseGroup.dates.map(d => (
          <DateRow
            key={d.key}
            d={d}
            mediatorId={mediatorId}
            hubspotMediatorId={hubspotMediatorId}
            respond={respond}
          />
        ))}
      </div>

      {dealModal && caseGroup.hubspot_record_id && (
        <DealInfoModal
          recordId={caseGroup.hubspot_record_id}
          recordName={caseGroup.record_name}
          onClose={() => setDealModal(false)}
        />
      )}
    </div>
  )
}

// ─── Main banner ─────────────────────────────────────────────

export default function ProvisionalBanner({ bookings, mediatorId }) {
  const [open,      setOpen]      = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const respond                                = useRespondToBooking()
  const { isMediator, isClerk, activeMediatorProfile } = useAuth()
  const hubspotMediatorId = activeMediatorProfile?.hubspot_mediator_object_id

  if (!bookings?.length || (!isMediator && !isClerk) || dismissed) return null

  const caseGroups  = buildCaseGroups(bookings)
  const totalDates  = caseGroups.reduce((n, c) => n + c.dates.length, 0)
  const totalCases  = caseGroups.length

  return (
    <div className="bg-purple-700 text-white shrink-0">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-2.5">
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-sm font-semibold hover:text-white/80 transition-colors">
          <Bell size={14} className={open ? '' : 'animate-pulse'} />
          {totalDates} date{totalDates > 1 ? 's' : ''} pending
          {totalCases > 1 && (
            <span className="text-purple-300 font-normal text-xs">across {totalCases} cases</span>
          )}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button onClick={() => setDismissed(true)}
          className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          title="Dismiss until next visit">
          <X size={14} />
        </button>
      </div>

      {/* Case-grouped list */}
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/20 pt-3">
          {caseGroups.map(caseGroup => (
            <CaseSection
              key={caseGroup.case_id || '__no_case'}
              caseGroup={caseGroup}
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
