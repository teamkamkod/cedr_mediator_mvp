import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Calendar, ShieldOff, ShieldCheck, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { useAllUsers, useToggleUserActive } from '../hooks/useAdmin'
import { useAuth } from '../lib/auth'
import { Avatar } from '../components/layout/AppLayout'
import InviteUserModal from '../components/admin/InviteUserModal'

const ROLE_TABS = ['all', 'mediator', 'clerk', 'super_admin']
const ROLE_LABELS = { mediator: 'Mediator', clerk: 'Clerk', super_admin: 'Admin', all: 'All users' }
const ROLE_COLORS = {
  mediator:    'bg-blue-100 text-blue-700',
  clerk:       'bg-teal-100 text-teal-700',
  super_admin: 'bg-purple-100 text-purple-700',
}

export default function AdminPage() {
  const { data: users, isLoading } = useAllUsers()
  const toggle    = useToggleUserActive()
  const { setActiveMediatorId } = useAuth()
  const navigate  = useNavigate()

  const [tab, setTab]           = useState('all')
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = users?.filter(u => {
    const matchTab    = tab === 'all' || u.role === tab
    const matchSearch = !search || [u.full_name, u.email].some(
      v => v?.toLowerCase().includes(search.toLowerCase())
    )
    return matchTab && matchSearch
  }) ?? []

  const stats = {
    total:    users?.length ?? 0,
    mediators: users?.filter(u => u.role === 'mediator').length ?? 0,
    clerks:    users?.filter(u => u.role === 'clerk').length ?? 0,
    active:    users?.filter(u => u.is_active).length ?? 0,
  }

  function handleViewCalendar(userId) {
    setActiveMediatorId(userId)
    navigate('/')
  }

  async function handleToggle(user) {
    if (!confirm(`${user.is_active ? 'Deactivate' : 'Reactivate'} ${user.full_name}?`)) return
    await toggle.mutateAsync({ userId: user.id, isActive: !user.is_active })
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-cedr-navy">Admin</h1>
          <p className="text-cedr-muted text-sm mt-0.5">Manage users, roles and calendar access</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={15} />
          Invite user
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total users',  value: stats.total },
          { label: 'Mediators',   value: stats.mediators },
          { label: 'Clerks',      value: stats.clerks },
          { label: 'Active',      value: stats.active },
        ].map(s => (
          <div key={s.label} className="card px-4 py-3">
            <p className="text-2xl font-bold text-cedr-navy">{s.value}</p>
            <p className="text-xs text-cedr-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex gap-1 bg-cedr-light rounded p-1">
          {ROLE_TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'px-3 py-1 rounded text-sm font-medium capitalize transition-colors',
                tab === t ? 'bg-white text-cedr-navy shadow-card' : 'text-cedr-muted hover:text-cedr-text'
              )}
            >
              {ROLE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cedr-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="input pl-8 text-sm w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-cedr-muted text-sm text-center py-12">No users found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-cedr-light border-b border-cedr-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-cedr-muted uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-cedr-muted uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-cedr-muted uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-cedr-muted uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cedr-border">
              {filtered.map(user => (
                <tr key={user.id} className={clsx('hover:bg-cedr-light/50 transition-colors', !user.is_active && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar profile={user} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-cedr-text">{user.full_name || '—'}</p>
                        <p className="text-xs text-cedr-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('status-badge text-xs font-medium px-2 py-1 rounded', ROLE_COLORS[user.role])}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs font-medium', user.is_active ? 'text-green-700' : 'text-red-500')}>
                      {user.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {user.role === 'mediator' && user.is_active && (
                        <button
                          onClick={() => handleViewCalendar(user.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-cedr-navy hover:bg-cedr-light border border-cedr-border transition-colors"
                        >
                          <Calendar size={12} />
                          View calendar
                        </button>
                      )}
                      <button
                        onClick={() => handleToggle(user)}
                        disabled={toggle.isPending}
                        className={clsx(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors',
                          user.is_active
                            ? 'text-red-600 hover:bg-red-50 border-transparent hover:border-red-200'
                            : 'text-green-700 hover:bg-green-50 border-transparent hover:border-green-200'
                        )}
                      >
                        {user.is_active
                          ? <><ShieldOff size={12} /> Deactivate</>
                          : <><ShieldCheck size={12} /> Reactivate</>
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <InviteUserModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
