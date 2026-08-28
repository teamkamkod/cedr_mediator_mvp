import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Update profile fields (first_name, last_name, avatar_url)
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

// Upload avatar to Supabase Storage and update user record
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

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      // Add cache-busting param so browser reloads the new image
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

// Change password
export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ newPassword }) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    },
  })
}

// Fetch clerks assigned to a mediator
export function useMediatorClerks(mediatorId) {
  return useQuery({
    queryKey: ['clerks', mediatorId],
    enabled: !!mediatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mediator_clerk_assignments')
        .select('*, clerk:clerk_id(id, email, full_name, avatar_url, is_active)')
        .eq('mediator_id', mediatorId)
      if (error) throw error
      return data
    },
  })
}

// Add a clerk by email (user must already exist)
export function useAddClerk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mediatorId, email }) => {
      // 1. Look up the clerk user by email
      const { data: clerkUser, error: lookupError } = await supabase
        .from('users')
        .select('id, role, is_active')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (lookupError || !clerkUser) {
        throw new Error('no_account')
      }
      if (!clerkUser.is_active) {
        throw new Error('inactive')
      }
      if (clerkUser.role !== 'clerk') {
        throw new Error('not_clerk')
      }

      // 2. Create the assignment
      const { data, error } = await supabase
        .from('mediator_clerk_assignments')
        .insert({ mediator_id: mediatorId, clerk_id: clerkUser.id })
        .select('*, clerk:clerk_id(id, email, full_name, avatar_url)')
        .single()

      if (error) {
        if (error.code === '23505') throw new Error('already_assigned')
        throw error
      }
      return data
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['clerks', mediatorId] })
    },
  })
}

// Remove a clerk assignment
export function useRemoveClerk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mediatorId, clerkId }) => {
      const { error } = await supabase
        .from('mediator_clerk_assignments')
        .delete()
        .eq('mediator_id', mediatorId)
        .eq('clerk_id', clerkId)
      if (error) throw error
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['clerks', mediatorId] })
    },
  })
}
