import { clsx } from 'clsx'
import { Repeat } from 'lucide-react'
import { SLOT_STATUSES } from '../../lib/constants'

export default function SlotCell({ slotData, period, onClick, compact = false }) {
  const { status = 'not_set', source, cases } = slotData || {}
  const meta = SLOT_STATUSES[status] || SLOT_STATUSES.not_set

  const statusStyles = {
    available:            'bg-green-50 border-green-200 text-green-800 hover:bg-green-100',
    unavailable:          'bg-red-50 border-red-200 text-red-600 hover:bg-red-100',
    ask_me:               'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
    provisionally_booked: 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100',
    confirmed:            'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100',
    not_set:              'bg-white border-cedr-border text-cedr-muted/50 hover:bg-cedr-light hover:border-cedr-muted/30',
  }

  if (compact) {
    // Month view — taller indicator with label
    return (
      <button
        onClick={onClick}
        title={`${period === 'morning' ? 'AM' : 'PM'}: ${meta.label}`}
        className={clsx(
          'w-full flex items-center gap-1 px-1.5 py-1 rounded border transition-all text-left',
          statusStyles[status]
        )}
      >
        <span className="text-[9px] font-bold uppercase opacity-60 shrink-0">
          {period === 'morning' ? 'AM' : 'PM'}
        </span>
        {status !== 'not_set' && (
          <span className="text-[10px] font-medium truncate leading-tight">
            {meta.label}
          </span>
        )}
      </button>
    )
  }

  // Week view — tall cell
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex flex-col gap-1 px-3 py-3 border rounded transition-all text-left group',
        statusStyles[status],
        'min-h-[90px]'
      )}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">
          {period === 'morning' ? 'AM' : 'PM'}
        </span>
        {source === 'series' && (
          <Repeat size={10} className="opacity-40 group-hover:opacity-70 transition-opacity" />
        )}
      </div>

      {status !== 'not_set' && (
        <span className="text-sm font-semibold leading-tight">
          {['provisionally_booked', 'confirmed'].includes(status) && cases?.case_name
            ? cases.case_name
            : meta.label}
        </span>
      )}

      {status === 'not_set' && (
        <span className="text-xs opacity-0 group-hover:opacity-50 transition-opacity">
          Click to set
        </span>
      )}
    </button>
  )
}
