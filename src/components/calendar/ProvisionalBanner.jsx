import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Bell, Check, X, ChevronDown, ChevronUp, AlertTriangle, Eye, Loader2, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRespondToBooking } from '../../hooks/useAvailability'
import { useAuth } from '../../lib/auth'
import { useCalendar } from '../../lib/CalendarContext'
import { supabase } from '../../lib/supabase'
import DealInfoModal from '../common/DealInfoModal'
import InfoBadge from '../common/InfoBadge'

// ─── Shared field row ─────────────────────────────────────────────

function Field({ label, value }) {
  return (
    <div className="flex gap-3 py-2 border-b border-cedr-border/40 last:border-b-0">
      <span className="text-[11px] font-semibold text-cedr-muted w-32 shrink-0 pt-0.5 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-cedr-navy">{value || <span className="text-cedr-muted/40">—</span>}</span>
    </div>
  )
}

function formatDate(val) {
  if (!val) return null
  try { return format(isNaN(Number(val)) ? parseISO(val) : new Date(Number(val)), 'd MMM yyyy') } catch { return val }
}
function formatTime(val) {
  if (!val) return null
  if (typeof val === 'string' && val.includes(':')) return val.slice(0, 5)
  try { return format(new Date(Number(val)), 'HH:mm') } catch { return val }
}

// ─── Accept confirmation modal ────────────────────────────────────

function AcceptConfirmModal({ d, caseGroup, onConfirm, onBack, isPending }) {
  const { isCRA, isSuperAdmin } = useAuth()
  const showRaw = isCRA || isSuperAdmin

  const [dealData, setDealData] = useState(null)
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!caseGroup.hubspot_record_id) return
    setLoading(true)
    supabase.functions.invoke('get-deal-info', { body: { record_id: caseGroup.hubspot_record_id } })
      .then(({ data }) => setDealData(data || null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [caseGroup.hubspot_record_id])

  // Build slot list for the "You are accepting" section
  const slotLines = d.isMultiDay
    ? (() => {
        const byDate = {}
        d.slots.forEach(s => {
          if (!byDate[s.date]) byDate[s.date] = []
          byDate[s.date].push(s.period === 'morning' ? 'AM' : 'PM')
        })
        return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, periods]) =>
          `${format(parseISO(date), 'EEE d MMM')} · ${periods.join(' + ')}`
        )
      })()
    : d.isFullDay
      ? [`${format(parseISO(d.date), 'EEE d MMM')} · Full day`]
      : [`${format(parseISO(d.date), 'EEE d MMM')} · ${d.period === 'morning' ? 'AM' : 'PM'}`]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 bg-black/40" onClick={onBack}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-xl shadow-lg border border-cedr-border w-full max-w-md overflow-y-auto max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cedr-border bg-cedr-light/40">
          <div className="flex items-center gap-2">
            <Check size={15} className="text-purple-600" />
            <p className="text-sm font-semibold text-cedr-navy">Confirm mediation date</p>
          </div>
          <button onClick={onBack} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Case info */}
          {caseGroup.hubspot_record_id ? (
            <div>
              <p className="text-[11px] font-semibold text-cedr-muted uppercase tracking-wide mb-2">Case details</p>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={16} className="animate-spin text-cedr-muted" />
                </div>
              ) : dealData ? (
                <div className="rounded-lg border border-cedr-border px-3 py-1">
                  {dealData.poc_name && (
                    <div className="flex gap-3 py-2 border-b border-cedr-border/40">
                      <span className="text-[11px] font-semibold text-cedr-muted w-32 shrink-0 pt-0.5 uppercase tracking-wide">POC</span>
                      <div>
                        <p className="text-sm text-cedr-navy">{dealData.poc_name}</p>
                        {dealData.poc_email && (
                          <a href={`mailto:${dealData.poc_email}`}
                            className="text-xs text-cedr-teal hover:underline transition-colors"
                            onClick={e => e.stopPropagation()}>
                            {dealData.poc_email}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  <Field label="Case Ref #"   value={dealData.enquiry_id} />
                  <Field label="Case Type"
                    value={dealData.case_type
                      ? (showRaw ? dealData.case_type : (dealData.case_type))
                      : null} />
                  <Field label="Date"         value={formatDate(dealData.date)} />
                  <Field label="Start / End"  value={
                    dealData.start_time || dealData.end_time
                      ? `${formatTime(dealData.start_time) || '—'} – ${formatTime(dealData.end_time) || '—'}`
                      : null
                  } />
                  <Field label="Location"     value={dealData.location} />
                  <Field label="Venue"        value={dealData.venue_address} />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-cedr-muted text-xs">
                  <Info size={12} />Case details not available
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-cedr-border px-3 py-2">
              <Field label="Case Ref #" value={caseGroup.case_id || '—'} />
            </div>
          )}

          {/* Slots being accepted */}
          <div>
            <p className="text-[11px] font-semibold text-cedr-muted uppercase tracking-wide mb-2">You are accepting</p>
            <div className="rounded-lg border border-purple-200 bg-purple-50 divide-y divide-purple-100">
              {slotLines.map((line, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                  <span className="text-sm font-medium text-purple-900">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onBack} className="btn-secondary flex-1 text-sm">Go back</button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 rounded font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50">
            <Check size={14} />
            {isPending ? 'Confirming…' : 'Confirm acceptance'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
    const sorted      = [...ss].sort((a, b) => a.date.localeCompare(b.date) || a.period.localeCompare(b.period))
    const uniqueDates = new Set(sorted.map(s => s.date))
    const isMultiDay  = uniqueDates.size > 1
    const hasAM       = sorted.some(s => s.period === 'morning')
    const hasPM       = sorted.some(s => s.period === 'afternoon')
    const isFullDay   = !isMultiDay && hasAM && hasPM   // AM+PM on SAME day only
    const fromDate    = sorted[0].date
    const toDate      = sorted[sorted.length - 1].date
    return {
      key,
      group_id:            sorted[0].group_id || null,
      date:                fromDate,
      fromDate,
      toDate,
      isFullDay,
      isMultiDay,
      period:              (isFullDay || isMultiDay) ? null : sorted[0].period,
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

function DateRow({ d, caseGroup, mediatorId, hubspotMediatorId, respond }) {
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [confirming,      setConfirming]      = useState(null)   // 'decline' only now
  const [conflictErr,     setConflictErr]     = useState(false)
  const { setCurrentDate } = useCalendar()
  const navigate = useNavigate()

  const firstLabel  = format(parseISO(d.fromDate), 'EEE d MMM')
  const lastLabel   = format(parseISO(d.toDate),   'EEE d MMM')
  const periodLabel = d.isFullDay ? 'Full day' : d.period === 'morning' ? 'AM' : 'PM'
  const dateDisplay = d.isMultiDay
    ? `From ${firstLabel} to ${lastLabel}`
    : `${firstLabel} · ${periodLabel}`

  function handleView() {
    setCurrentDate(parseISO(d.date))
    navigate('/')
  }

  async function executeAccept() {
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
          respond.mutateAsync({ slotId: slot.id, mediatorId, action: 'accept', extraPayload })
        )
      )
      setShowAcceptModal(false)
    } catch (err) {
      if (err?.message === 'CASE_CONFLICT') {
        setConflictErr(true)
        setShowAcceptModal(false)
      }
    }
  }

  async function executeDecline() {
    const extraPayload = {
      hubspot_mediator_object_id: hubspotMediatorId || null,
      slot_date:  d.date,
      slot_time:  d.isFullDay ? 'full_day' : d.period,
      case_id:    d.case_id || null,
      group_id:   d.group_id || null,
    }
    try {
      await Promise.all(
        d.slots.map(slot =>
          respond.mutateAsync({ slotId: slot.id, mediatorId, action: 'decline', extraPayload })
        )
      )
      setConfirming(null)
    } catch { setConfirming(null) }
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

  // — Decline confirming state (keep inline — quick, irreversible)
  if (confirming === 'decline') return (
    <div className="flex items-center gap-2 pl-4 pr-3 py-2 border-l-2 border-white/30 bg-white/5">
      <AlertTriangle size={11} className="text-white/60 shrink-0" />
      <span className="text-xs text-white/90 flex-1">
        Decline <span className="font-semibold">{dateDisplay}</span>?
      </span>
      <button onClick={() => setConfirming(null)}
        className="px-2 py-0.5 rounded text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-colors">
        Cancel
      </button>
      <button onClick={executeDecline} disabled={respond.isPending}
        className="px-2.5 py-0.5 rounded text-xs font-semibold bg-red-500 text-white hover:bg-red-400 transition-colors disabled:opacity-50">
        {respond.isPending ? '…' : 'Decline'}
      </button>
    </div>
  )

  // — Default row
  return (
    <>
      <div className="flex items-center gap-2 pl-4 pr-3 py-2 border-l-2 border-purple-400/40 hover:bg-white/5 transition-colors">
        <span className="text-sm font-medium text-white flex-1">{dateDisplay}</span>
        <div className="flex gap-1 shrink-0">
          <button onClick={handleView}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-white/70 bg-white/10 hover:bg-white/20 transition-colors">
            <Eye size={10} />View
          </button>
          <button onClick={() => setConfirming('decline')}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-white/70 bg-white/10 hover:bg-white/20 transition-colors">
            <X size={10} />Decline
          </button>
          <button onClick={() => setShowAcceptModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-white text-purple-800 hover:bg-white/90 transition-colors">
            <Check size={10} />Accept
          </button>
        </div>
      </div>
      {showAcceptModal && (
        <AcceptConfirmModal
          d={d}
          caseGroup={caseGroup}
          onConfirm={executeAccept}
          onBack={() => setShowAcceptModal(false)}
          isPending={respond.isPending}
        />
      )}
    </>
  )
}

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
        <span className="font-semibold">{dateDisplay}</span>?
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
      <span className="text-sm font-medium text-white flex-1">{dateDisplay}</span>
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
  const { isCRA, isSuperAdmin }   = useAuth()
  const count     = caseGroup.dates.length
  // CRA/admin see deal name; clerk/mediator see case reference number
  const caseLabel = (isCRA || isSuperAdmin)
    ? (caseGroup.record_name || `Case ${caseGroup.case_id?.slice(0, 8) || '—'}`)
    : (caseGroup.case_id     || '—')

  return (
    <div className="rounded-lg overflow-hidden border border-white/15">
      {/* Case header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/10">
        <div className="w-2 h-2 rounded-full bg-purple-300 shrink-0" />
        <span className="text-sm font-semibold text-white truncate flex-1">
          {caseLabel}
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
            caseGroup={caseGroup}
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
