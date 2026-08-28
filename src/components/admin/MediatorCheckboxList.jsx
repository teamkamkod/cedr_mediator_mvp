import { clsx } from 'clsx'
import { Avatar } from '../layout/AppLayout'

export default function MediatorCheckboxList({ mediators = [], selected = [], onChange }) {
  function toggle(id) {
    onChange(
      selected.includes(id)
        ? selected.filter(s => s !== id)
        : [...selected, id]
    )
  }

  if (!mediators.length) {
    return <p className="text-sm text-cedr-muted text-center py-4">No active mediators found.</p>
  }

  return (
    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
      {mediators.map(m => {
        const checked = selected.includes(m.id)
        return (
          <label
            key={m.id}
            className={clsx(
              'flex items-center gap-3 p-3 rounded border cursor-pointer transition-all',
              checked
                ? 'border-cedr-navy bg-cedr-light'
                : 'border-cedr-border hover:border-cedr-navy/30'
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(m.id)}
              className="accent-cedr-navy shrink-0"
            />
            <Avatar profile={m} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-cedr-text truncate">
                {m.full_name || m.email}
              </p>
              <p className="text-xs text-cedr-muted truncate">{m.email}</p>
            </div>
          </label>
        )
      })}
    </div>
  )
}
