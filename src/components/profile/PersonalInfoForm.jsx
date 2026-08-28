import { useState, useRef } from 'react'
import { Camera, Check } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useUpdateProfile, useUploadAvatar } from '../../hooks/useProfile'
import { Avatar } from '../layout/AppLayout'

export default function PersonalInfoForm() {
  const { profile, refreshProfile } = useAuth()
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName]   = useState(profile?.last_name  || '')
  const [saved, setSaved]         = useState(false)
  const fileRef                   = useRef()

  const updateProfile = useUpdateProfile()
  const uploadAvatar  = useUploadAvatar()

  async function handleSave(e) {
    e.preventDefault()
    await updateProfile.mutateAsync({
      userId: profile.id,
      updates: { first_name: firstName.trim(), last_name: lastName.trim() },
    })
    await refreshProfile()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadAvatar.mutateAsync({ userId: profile.id, file })
    await refreshProfile()
  }

  const saving = updateProfile.isPending
  const uploading = uploadAvatar.isPending

  return (
    <section className="card p-6">
      <h2 className="text-base font-semibold text-cedr-navy mb-5">Personal information</h2>

      <div className="flex items-start gap-6 mb-6">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar profile={profile} size="lg" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-cedr-navy text-white rounded-full flex items-center justify-center hover:bg-cedr-navy-dark transition-colors shadow"
          >
            {uploading
              ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              : <Camera size={13} />
            }
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="flex-1 text-sm">
          <p className="font-semibold text-cedr-text">{profile?.full_name || '—'}</p>
          <p className="text-cedr-muted capitalize mt-0.5">{profile?.role}</p>
          <p className="text-cedr-muted text-xs mt-0.5">{profile?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-cedr-text mb-1">First name</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="input"
              placeholder="Jane"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cedr-text mb-1">Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="input"
              placeholder="Smith"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-700">
              <Check size={14} /> Saved
            </span>
          )}
        </div>

        {updateProfile.isError && (
          <p className="text-red-600 text-sm">{updateProfile.error?.message}</p>
        )}
      </form>
    </section>
  )
}
