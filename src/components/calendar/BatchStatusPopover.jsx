import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { SLOT_STATUSES, EDITABLE_STATUSES } from '../../lib/constants'
import { useBatchUpsertSlots } from '../../hooks/useAvailability'

export default function BatchStatusPopover({ selectedSlots, mediatorId, onClose, onDone }) {
  const [status, setStatus] = useState('not_set')
  const [notes,  setNotes]  = useState('')
  const upsert = useBatchUpsertSlots()
  const ref    = useRef()

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  async function handleSave() {
    await upsert.mutateAsync({
      mediatorId,
      slots:  selectedSlots.map(s => ({ dateStr: s.dateStr, period: s.period })),
      status,
      notes,
    })
    onDone()
  }

  const count = selectedSlots.length

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-black/20" onClick={onClose}>
      <div ref={ref} onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-popover border border-cedr-border w-full max-w-sm mb-4 overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-cedr-border">
          <div>
            <p className="text-sm font-semibold text-cedr-navy">Set status</p>
            <p className="text-xs text-cedr-muted mt-0.5">
              Applying to {count} slot{count > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-cedr-muted mb-2 uppercase tracking-wide">Status</p>
            <div className="grid grid-cols-3 gap-1.5">
              {EDITABLE_STATUSES.map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={clsx(
                    'px-2 py-2.5 rounded text-xs font-medium border transition-all',
                    status === s
                      ? SLOT_STATUSES[s].color + ' ring-2 ring-offset-1 ring-cedr-navy/30'
                      : 'border-cedr-border text-cedr-muted hover:border-cedr-navy/30'
                  )}>
                  {SLOT_STATUSES[s].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-cedr-muted mb-1 uppercase tracking-wide">Notes</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Optional — applies to all selected slots…"
              rows={2} className="input text-xs resize-none" />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={handleSave} disabled={upsert.isPending || status === 'not_set'}
            className="btn-primary flex-1 text-sm">
            {upsert.isPending ? 'Saving…' : `Apply to ${count} slot${count > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
