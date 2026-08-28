import { useAuth } from '../../lib/auth'
import { useMediators } from '../../hooks/useAssignments'
import { Avatar } from '../layout/AppLayout'
import { Calendar } from 'lucide-react'

export default function MediatorPicker() {
  const { setActiveMediatorId } = useAuth()
  const { data: mediators = [], isLoading } = useMediators()

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-cedr-light border border-cedr-border rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={22} className="text-cedr-navy" />
          </div>
          <h2 className="text-lg font-semibold text-cedr-navy">Select a mediator</h2>
          <p className="text-sm text-cedr-muted mt-1">
            Choose whose calendar you'd like to view or manage.
          </p>
        </div>

        {/* Mediator cards */}
        {isLoading ? (
          <div className="flex justify-center">
            <div className="w-5 h-5 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mediators.length === 0 ? (
          <p className="text-center text-cedr-muted text-sm">
            No active mediators found. Invite one from the Admin page.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {mediators.map(m => (
              <button
                key={m.id}
                onClick={() => setActiveMediatorId(m.id)}
                className="card p-4 flex items-center gap-3 hover:border-cedr-navy/30 hover:shadow-md transition-all text-left group"
              >
                <Avatar profile={m} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-cedr-navy truncate">
                    {m.full_name || m.email}
                  </p>
                  <p className="text-xs text-cedr-muted truncate">{m.email}</p>
                </div>
                <span className="text-cedr-muted group-hover:text-cedr-navy transition-colors text-sm shrink-0">
                  →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
