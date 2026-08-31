import { useRef, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { X, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { resolveSlot } from '../../hooks/useAvailability'
import { Avatar } from '../layout/AppLayout'

function effectiveStatus(status) {
  return status === 'not_set' ? 'call_me' : status
}

function getMediatorSlotInfo(mediator, date, period, slotsByMediator, seriesByMediator) {
  const slot = resolveSlot(date, period, slotsByMediator[mediator.id] || [], seriesByMediator[mediator.id] || [])
  return { status: effectiveStatus(slot.status), notes: slot.notes || null }
}

function getMediatorRangeInfo(mediator, rangeSlots, slotsByMediator, seriesByMediator) {
  const slots  = slotsByMediator[mediator.id] || []
  const series = seriesByMediator[mediator.id] || []
  let allAvailable = true
  let anyAvailable = false
  const notes = []

  for (const { dateStr, period } of rangeSlots) {
    const date = parseISO(dateStr)
    const slot = resolveSlot(date, period, slots, series)
    const eff  = effectiveStatus(slot.status)

    if (!['available', 'call_me'].includes(eff)) return null // not eligible
    if (eff === 'available') anyAvailable = true
    else allAvailable = false
    if (slot.notes) notes.push({ dateStr, period, note: slot.notes })
  }

  const badge = allAvailable ? 'available_all' : anyAvailable ? 'partially' : 'call_me_all'
  return { badge, notes }
}

const BADGE = {
  available_all: { label: 'Available on all selection', class: 'bg-green-100 text-green-800 border-green-200' },
  partially:     { label: 'Partially available',        class: 'bg-amber-100 text-amber-800 border-amber-200' },
  call_me_all:   { label: 'Call me',                   class: 'bg-blue-100  text-blue-800  border-blue-200'  },
  available:     { label: 'Available',                  class: 'bg-green-100 text-green-800 border-green-200' },
  call_me:       { label: 'Call me',                   class: 'bg-blue-100  text-blue-800  border-blue-200'  },
}

export default function SlotAggregatePopover({
  date, period, mediators, slotsByMediator, seriesByMediator,
  rangeSlots, onClose, onViewMediator,
}) {
  const ref = useRef()

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  const hasRange = rangeSlots.length > 0

  // Build mediator list
  const mediatorRows = mediators.map(m => {
    if (hasRange) {
      const info = getMediatorRangeInfo(m, rangeSlots, slotsByMediator, seriesByMediator)
      if (!info) return null
      return { mediator: m, badge: info.badge, notes: info.notes }
    } else {
      const info = getMediatorSlotInfo(m, date, period, slotsByMediator, seriesByMediator)
      if (!['available', 'call_me'].includes(info.status)) return null
      return {
        mediator: m,
        badge: info.status,
        notes: info.notes ? [{ dateStr: format(date, 'yyyy-MM-dd'), period, note: info.notes }] : [],
      }
    }
  }).filter(Boolean)

  const title = hasRange
    ? `Mediators available for selection`
    : `${format(date, 'EEE d MMM')} · ${period === 'morning' ? 'AM' : 'PM'}`

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/20" onClick={onClose}>
      <div ref={ref} onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-lg border border-cedr-border w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cedr-border shrink-0">
          <div>
            <p className="text-sm font-semibold text-cedr-navy">{title}</p>
            <p className="text-xs text-cedr-muted mt-0.5">
              {mediatorRows.length} mediator{mediatorRows.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        {/* Mediator list */}
        <div className="overflow-y-auto flex-1">
          {mediatorRows.length === 0 ? (
            <div className="p-8 text-center text-cedr-muted text-sm">
              No mediators available for this selection
            </div>
          ) : (
            mediatorRows.map(({ mediator, badge, notes }) => {
              const badgeCfg = BADGE[badge] || BADGE.call_me
              return (
                <div key={mediator.id}
                  className="flex items-start gap-3 px-5 py-3.5 border-b border-cedr-border/60 last:border-b-0 hover:bg-cedr-light/40 transition-colors">
                  <Avatar profile={mediator} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-cedr-navy">{mediator.full_name}</p>
                    <span className={clsx('inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border mt-1', badgeCfg.class)}>
                      {badgeCfg.label}
                    </span>
                    {/* Notes per slot */}
                    {notes.map((n, i) => (
                      <p key={i} className="text-xs text-cedr-muted mt-1 italic">
                        {hasRange && (
                          <span className="font-medium not-italic text-cedr-text/60">
                            {format(parseISO(n.dateStr), 'd MMM')} {n.period === 'morning' ? 'AM' : 'PM'} ·{' '}
                          </span>
                        )}
                        {n.note}
                      </p>
                    ))}
                  </div>
                  <button
                    onClick={() => onViewMediator(mediator)}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-cedr-navy border border-cedr-border rounded hover:bg-cedr-light hover:border-cedr-navy/30 transition-all"
                  >
                    View calendar <ChevronRight size={12} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
