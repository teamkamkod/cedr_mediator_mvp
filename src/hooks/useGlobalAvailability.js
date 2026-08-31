import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useAllMediators() {
  return useQuery({
    queryKey:  ['all-mediators'],
    staleTime: 5 * 60 * 1000,
    queryFn:   async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, first_name, last_name, email, avatar_url, hubspot_mediator_object_id')
        .eq('role', 'mediator')
        .eq('is_active', true)
        .order('last_name')
      if (error) throw error
      return data
    },
  })
}

export function useAllSeries(mediatorIds) {
  return useQuery({
    queryKey:  ['all-series', mediatorIds.join(',')],
    enabled:   mediatorIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn:   async () => {
      const { data, error } = await supabase
        .from('recurring_series')
        .select('id, mediator_id, day_of_week, period, status, frequency, start_date, end_date, notes')
        .in('mediator_id', mediatorIds)
        .eq('is_active', true)
      if (error) throw error
      return data
    },
  })
}

export function useGlobalSlots(mediatorIds, dateFrom, dateTo) {
  return useQuery({
    queryKey: ['global-slots', mediatorIds.join(','), dateFrom, dateTo],
    enabled:  mediatorIds.length > 0 && !!dateFrom && !!dateTo,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('id, mediator_id, date, period, status, notes, series_id, is_exception, created_by, group_id')
        .in('mediator_id', mediatorIds)
        .gte('date', dateFrom)
        .lte('date', dateTo)
      if (error) throw error
      return data
    },
  })
}
