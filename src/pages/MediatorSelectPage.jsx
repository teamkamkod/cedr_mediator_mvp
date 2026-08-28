import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Avatar } from '../components/layout/AppLayout'

export default function MediatorSelectPage() {
  const { clerkAssignments, setActiveMediatorId, profile } = useAuth()
  const navigate = useNavigate()

  function handleSelect(mediatorId) {
    setActiveMediatorId(mediatorId)
    navigate('/', { replace: true })
  }

  if (!clerkAssignments) {
    return (
      <div className="min-h-screen bg-cedr-light flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cedr-light flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="https://www.cedr.com/hubfs/New_CEDR_2025/Images/CEDR_Logo%20Dark.svg"
            alt="CEDR"
            className="h-9 mx-auto mb-3"
          />
          <h1 className="text-cedr-navy font-semibold text-lg">Select a mediator</h1>
          <p className="text-cedr-muted text-sm mt-1">
            You manage calendars for {clerkAssignments.length} mediators.
            <br />Whose calendar would you like to open?
          </p>
        </div>

        <div className="space-y-2">
          {clerkAssignments.map(({ mediator_id, mediator }) => (
            <button
              key={mediator_id}
              onClick={() => handleSelect(mediator_id)}
              className="w-full card p-4 flex items-center gap-4 hover:border-cedr-navy/30 hover:shadow-md transition-all text-left group"
            >
              <Avatar profile={mediator} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-cedr-navy group-hover:text-cedr-navy">
                  {mediator?.full_name || mediator?.email}
                </p>
                <p className="text-xs text-cedr-muted truncate">{mediator?.email}</p>
              </div>
              <span className="text-cedr-muted group-hover:text-cedr-navy transition-colors text-sm">
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
