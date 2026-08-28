import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Calendar, User, Shield, LogOut, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { clsx } from 'clsx'

export default function AppLayout() {
  const { profile, isSuperAdmin, isClerk, clerkAssignments,
          activeMediatorProfile, setActiveMediatorId } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function handleSwitchMediator() {
    setActiveMediatorId(null)
    navigate('/select-mediator', { replace: true })
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-cedr-navy flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <img
            src="https://www.cedr.com/hubfs/New_CEDR_2025/Images/CEDR-logo%20White.svg"
            alt="CEDR"
            className="h-7"
          />
          <p className="text-white/50 text-xs mt-1 font-medium tracking-wide uppercase">
            Mediator Portal
          </p>
        </div>

        {/* Active mediator banner — shown to clerks and super_admin when a mediator is selected */}
        {(isClerk || isSuperAdmin) && activeMediatorProfile && (
          <div className="px-4 py-3 bg-white/10 border-b border-white/10">
            <p className="text-white/50 text-[10px] uppercase tracking-wide font-medium mb-1">
              Managing calendar for
            </p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar profile={activeMediatorProfile} size="sm" />
                <p className="text-white text-sm font-medium truncate">
                  {activeMediatorProfile.full_name}
                </p>
              </div>
              {/* Clerks: show if multiple assignments. Super admin: always show */}
              {(isSuperAdmin || (clerkAssignments?.length > 1)) && (
                <button
                  onClick={handleSwitchMediator}
                  title="Switch mediator"
                  className="text-white/50 hover:text-white transition-colors shrink-0"
                >
                  <RefreshCw size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem to="/" icon={<Calendar size={16} />} label="Calendar" end />
          <NavItem to="/profile" icon={<User size={16} />} label="Profile" />
          {isSuperAdmin && (
            <NavItem to="/admin" icon={<Shield size={16} />} label="Admin" />
          )}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <Avatar profile={profile} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {profile?.full_name || profile?.email}
              </p>
              <p className="text-white/50 text-xs capitalize">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors w-full"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors',
          isActive
            ? 'bg-white/15 text-white'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

export function Avatar({ profile, size = 'md' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name}
        className={clsx('rounded-full object-cover', sizes[size])}
      />
    )
  }
  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]].filter(Boolean).join('') || '?'
  return (
    <div className={clsx('rounded-full bg-cedr-teal flex items-center justify-center text-white font-semibold shrink-0', sizes[size])}>
      {initials}
    </div>
  )
}
