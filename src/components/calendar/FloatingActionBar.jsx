import { useState } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useDeleteSlots } from '../../hooks/useAvailability'

const BOOKABLE_STATUSES = ['available', 'ask_me']

export default function FloatingActionBar({ selectedSlots, onClear, onAction, mediatorId }) {
  const { isCRA } = useAuth()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteSlots = useDeleteSlots()

  const count    = selectedSlots.length
  if (!count) return null

  // Book is only enabled when ALL selected slots are available or ask_me
  const canBook  = selectedSlots.every(s =>
    BOOKABLE_STATUSES.includes(s.slotData?.status || 'not_set')
  )

  async function handleDelete() {
    const ids = selectedSlots.map(s => s.slotData?.id).filter(Boolean)
    if (!ids.length) { onClear(); return }
    await deleteSlots.mutateAsync({ slotIds: ids, mediatorId })
    setConfirmDelete(false)
    onClear()
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">

      {/* Delete confirm banner */}
      {confirmDelete && (
        <div className="flex items-center gap-3 bg-red-700 text-white rounded-full shadow-lg px-5 py-2.5 border border-red-500/30 text-sm">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Delete {count} slot{count > 1 ? 's' : ''}? This cannot be undone.</span>
          <button onClick={() => setConfirmDelete(false)}
            className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-medium transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleteSlots.isPending}
            className="px-3 py-1 rounded-full bg-white text-red-700 hover:bg-white/90 text-xs font-semibold transition-colors disabled:opacity-50">
            {deleteSlots.isPending ? 'Deleting…' : 'Confirm'}
          </button>
        </div>
      )}

      {/* Main bar */}
      <div className="flex items-center gap-3 bg-cedr-navy text-white rounded-full shadow-lg px-5 py-3 border border-white/10">
        <span className="text-sm font-semibold">
          {count} slot{count > 1 ? 's' : ''} selected
        </span>

        <button onClick={onClear} className="text-white/60 hover:text-white transition-colors" title="Clear selection">
          <X size={15} />
        </button>

        <div className="w-px h-4 bg-white/20" />

        {/* Delete — always enabled */}
        <button onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors">
          <Trash2 size={13} />
          Delete {count}
        </button>

        {/* Book — CRA only, enabled only when all slots are bookable */}
        {isCRA && (
          <button onClick={canBook ? onAction : undefined} disabled={!canBook}
            title={!canBook ? 'Only Available or Ask Me slots can be booked' : undefined}
            className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-colors ${
              canBook
                ? 'bg-purple-500 hover:bg-purple-400 text-white cursor-pointer'
                : 'bg-white/20 text-white/40 cursor-not-allowed'
            }`}>
            Book {count} slot{count > 1 ? 's' : ''}
          </button>
        )}

        {/* Set status — mediator/clerk */}
        {!isCRA && (
          <button onClick={onAction}
            className="text-sm font-semibold px-4 py-1.5 rounded-full bg-white text-cedr-navy hover:bg-white/90 transition-colors">
            Set status
          </button>
        )}
      </div>
    </div>
  )
}
