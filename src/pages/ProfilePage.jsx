import { useAuth } from '../lib/auth'
import PersonalInfoForm  from '../components/profile/PersonalInfoForm'
import ChangePasswordForm from '../components/profile/ChangePasswordForm'
import ClerkManager      from '../components/profile/ClerkManager'

export default function ProfilePage() {
  const { profile, isMediator } = useAuth()

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-cedr-navy">Profile</h1>
        <p className="text-cedr-muted text-sm mt-1">Manage your account settings</p>
      </div>

      <PersonalInfoForm />
      <ChangePasswordForm />
      {isMediator && <ClerkManager mediatorId={profile?.id} />}
    </div>
  )
}
