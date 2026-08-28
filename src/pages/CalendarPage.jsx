import { useAuth } from '../lib/auth'

export default function CalendarPage() {
  const { profile } = useAuth()
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-cedr-navy">
          {profile?.full_name ? `${profile.full_name}'s Calendar` : 'Calendar'}
        </h1>
        <p className="text-cedr-muted text-sm mt-1">Manage your availability</p>
      </div>
      <div className="card p-6 text-cedr-muted text-sm">
        Calendar component coming next — scaffold ready ✓
      </div>
    </div>
  )
}
