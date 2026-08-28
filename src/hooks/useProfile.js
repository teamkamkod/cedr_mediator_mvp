import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, updates }) => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, file }) => {
      const ext  = file.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatarUrl = `${publicUrl}?t=${Date.now()}`
      const { data, error } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ newPassword }) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    },
  })
}

// Fetch clerks assigned to a mediator (includes revoked ones so we can show status)
export function useMediatorClerks(mediatorId) {
  return useQuery({
    queryKey: ['clerks', mediatorId],
    enabled: !!mediatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mediator_clerk_assignments')
        .select('*, clerk:clerk_id(id, email, full_name, avatar_url, first_name, last_name, is_active)')
        .eq('mediator_id', mediatorId)
      if (error) throw error
      return data
    },
  })
}

// Invite a new clerk — calls the Edge Function which handles auth user creation
export function useInviteClerk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mediatorId, firstName, lastName, email }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-clerk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mediator_id: mediatorId,
            first_name:  firstName,
            last_name:   lastName,
            email,
          }),
        }
      )
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to invite clerk')
      }
      return json
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['clerks', mediatorId] })
    },
  })
}

// Revoke a clerk — calls Postgres RPC which deactivates the user
export function useRevokeClerk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mediatorId, clerkId }) => {
      const { error } = await supabase.rpc('revoke_clerk', { p_clerk_id: clerkId })
      if (error) throw error
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['clerks', mediatorId] })
    },
  })
}
