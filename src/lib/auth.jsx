import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined)
  const [profile, setProfile]   = useState(null)
  const [activeMediatorId, setActiveMediatorIdState] = useState(
    () => sessionStorage.getItem('active_mediator_id')
  )
  const [activeMediatorProfile, setActiveMediatorProfile] = useState(null)
  const [clerkAssignments, setClerkAssignments]           = useState(null)

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

  useEffect(() => {
    if (!activeMediatorId) { setActiveMediatorProfile(null); return }
    supabase
      .from('users')
      .select('id, full_name, first_name, last_name, email, avatar_url, hubspot_mediator_object_id')
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
      sessionStorage.setItem('auth_error', 'deactivated')
      await supabase.auth.signOut()
      return
    }

    setProfile(data)

    if (data.role === 'mediator') {
      setActiveMediatorId(data.id)

    } else if (data.role === 'clerk') {
      const { data: assignments } = await supabase
        .from('mediator_clerk_assignments')
        .select('mediator_id, mediator:mediator_id(id, full_name, first_name, last_name, email, avatar_url)')
        .eq('clerk_id', userId)

      setClerkAssignments(assignments || [])

      if (assignments?.length === 1) {
        setActiveMediatorId(assignments[0].mediator_id)
      } else if (assignments?.length > 1) {
        const stored = sessionStorage.getItem('active_mediator_id')
        const valid  = assignments.some(a => a.mediator_id === stored)
        if (!valid) setActiveMediatorId(null)
      }

    } else if (data.role === 'super_admin' || data.role === 'cra') {
      // Both super_admin and CRA see all mediators via MediatorPicker
      // Support ?mediator_id= URL param (HubSpot iframe flow)
      const urlParams   = new URLSearchParams(window.location.search)
      const urlMediator = urlParams.get('mediator_id')
      if (urlMediator) {
        setActiveMediatorId(urlMediator)
      }
    }
  }

  const role = profile?.role

  const value = {
    session,
    profile,
    loading:             session === undefined,
    isAuthenticated:     !!session,
    isSuperAdmin:        role === 'super_admin',
    isMediator:          role === 'mediator',
    isClerk:             role === 'clerk',
    isCRA:               role === 'cra',
    // Can manage users in Admin page
    isAdmin:             role === 'super_admin',
    activeMediatorId,
    setActiveMediatorId,
    activeMediatorProfile,
    clerkAssignments,
    needsMediatorSelect: role === 'clerk' && clerkAssignments !== null && !activeMediatorId && clerkAssignments.length > 1,
    refreshProfile: () => session && fetchProfile(session.user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
