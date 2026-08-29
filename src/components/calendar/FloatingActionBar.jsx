import { X } from 'lucide-react'
import { useAuth } from '../../lib/auth'

export default function FloatingActionBar({ selectedSlots, onClear, onAction }) {
  const { isCRA } = useAuth()
  const count = selectedSlots.length
  if (!count) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-cedr-navy text-white rounded-full shadow-lg px-5 py-3 border border-white/10">
      <span className="text-sm font-semibold">
        {count} slot{count > 1 ? 's' : ''} selected
      </span>
      <button
        onClick={onClear}
        className="text-white/60 hover:text-white transition-colors"
        title="Clear selection"
      >
        <X size={15} />
      </button>
      <div className="w-px h-4 bg-white/20" />
      <button
        onClick={onAction}
        className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-colors ${
          isCRA
            ? 'bg-purple-500 hover:bg-purple-400 text-white'
            : 'bg-white text-cedr-navy hover:bg-white/90'
        }`}
      >
        {isCRA ? `Book ${count} slot${count > 1 ? 's' : ''}` : 'Set status'}
      </button>
    </div>
  )
}
