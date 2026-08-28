import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined)
  const [profile, setProfile]   = useState(null)
  // activeMediatorId: whose calendar we're currently managing
  // - mediator: always their own id
  // - clerk: the selected mediator's id (null = not selected yet)
  // - super_admin: null (they pick from admin page)
  const [activeMediatorId, setActiveMediatorIdState] = useState(
    () => sessionStorage.getItem('active_mediator_id')
  )
  const [activeMediatorProfile, setActiveMediatorProfile] = useState(null)
  const [clerkAssignments, setClerkAssignments]           = useState(null) // null = not loaded yet

  function setActiveMediatorId(id) {
    setActiveMediatorIdState(id)
    if (id) sessionStorage.setItem('active_mediator_id', id)
    else sessionStorage.removeItem('active_mediator_id')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setActiveMediatorId(null)
        setClerkAssignments(null)
        setActiveMediatorProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // When activeMediatorId changes, fetch that mediator's profile for display
  useEffect(() => {
    if (!activeMediatorId) { setActiveMediatorProfile(null); return }
    supabase
      .from('users')
      .select('id, full_name, first_name, last_name, email, avatar_url')
      .eq('id', activeMediatorId)
      .single()
      .then(({ data }) => setActiveMediatorProfile(data))
  }, [activeMediatorId])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!data || data.is_active === false) {
      await supabase.auth.signOut()
      return
    }

    setProfile(data)

    if (data.role === 'mediator') {
      // Mediator always sees their own calendar
      setActiveMediatorId(data.id)
    } else if (data.role === 'clerk') {
      // Load assignments to determine routing
      const { data: assignments } = await supabase
        .from('mediator_clerk_assignments')
        .select('mediator_id, mediator:mediator_id(id, full_name, first_name, last_name, email, avatar_url)')
        .eq('clerk_id', userId)

      setClerkAssignments(assignments || [])

      if (assignments?.length === 1) {
        // Single mediator — auto-select
        setActiveMediatorId(assignments[0].mediator_id)
      } else if (assignments?.length > 1) {
        // Multiple — only keep stored selection if it's valid
        const stored = sessionStorage.getItem('active_mediator_id')
        const valid  = assignments.some(a => a.mediator_id === stored)
        if (!valid) setActiveMediatorId(null)
      }
    }
    // super_admin: activeMediatorId stays null until they pick one from admin
  }

  const value = {
    session,
    profile,
    loading:               session === undefined,
    isAuthenticated:       !!session,
    isSuperAdmin:          profile?.role === 'super_admin',
    isMediator:            profile?.role === 'mediator',
    isClerk:               profile?.role === 'clerk',
    activeMediatorId,
    setActiveMediatorId,
    activeMediatorProfile,
    clerkAssignments,      // list of {mediator_id, mediator: {...}} for clerks
    needsMediatorSelect:   profile?.role === 'clerk' && clerkAssignments !== null && !activeMediatorId && clerkAssignments.length > 1,
    refreshProfile: () => session && fetchProfile(session.user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
