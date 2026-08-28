import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// All active mediators (for assignment selectors)
export function useMediators() {
  return useQuery({
    queryKey: ['admin', 'mediators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, first_name, last_name, email, avatar_url')
        .eq('role', 'mediator')
        .eq('is_active', true)
        .order('last_name')
      if (error) throw error
      return data
    },
  })
}

// Clerk's current mediator assignments
export function useClerkAssignments(clerkId) {
  return useQuery({
    queryKey: ['admin', 'assignments', clerkId],
    enabled: !!clerkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mediator_clerk_assignments')
        .select('mediator_id')
        .eq('clerk_id', clerkId)
      if (error) throw error
      return data.map(a => a.mediator_id)
    },
  })
}

// Save assignment diff: add new ones, remove deleted ones
export function useSaveAssignments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clerkId, newMediatorIds, previousMediatorIds }) => {
      const toAdd    = newMediatorIds.filter(id => !previousMediatorIds.includes(id))
      const toRemove = previousMediatorIds.filter(id => !newMediatorIds.includes(id))

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from('mediator_clerk_assignments')
          .insert(toAdd.map(mediator_id => ({ mediator_id, clerk_id: clerkId })))
        if (error) throw error
      }

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('mediator_clerk_assignments')
          .delete()
          .eq('clerk_id', clerkId)
          .in('mediator_id', toRemove)
        if (error) throw error
      }
    },
    onSuccess: (_, { clerkId }) => {
      // Refresh the assignments modal data
      qc.invalidateQueries({ queryKey: ['admin', 'assignments', clerkId] })
      // Refresh admin user list (stats)
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      // Refresh clerk's own assignment list used in auth context + sidebar
      qc.invalidateQueries({ queryKey: ['clerks'] })
      // Refresh mediator list (in case it's displayed somewhere)
      qc.invalidateQueries({ queryKey: ['admin', 'mediators'] })
    },
  })
}
