import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { differenceInCalendarWeeks, parseISO, getDay, getDate, format, subDays } from 'date-fns'

// Resolves slot data for a given date + period
// Priority: explicit slot > recurring series > not_set
export function resolveSlot(date, period, slots, series) {
  const dateStr = format(date, 'yyyy-MM-dd')

  // 1. Explicit slot wins (incl. 'deleted' exceptions which suppress the series)
  const explicit = slots?.find(s => s.date === dateStr && s.period === period)
  if (explicit) {
    // 'deleted' renders as not_set but keeps source so delete button isn't shown again
    if (explicit.status === 'deleted') return { ...explicit, status: 'not_set', source: 'explicit_deleted' }
    return { ...explicit, source: 'explicit' }
  }

  // 2. Check recurring series
  const rawDay    = getDay(date)
  const dayOfWeek = rawDay === 0 ? 6 : rawDay - 1

  const matchingSeries = series?.find(s => {
    if (!s.is_active) return false
    if (s.day_of_week !== dayOfWeek) return false
    if (s.period !== period) return false
    if (dateStr < s.start_date) return false
    if (s.end_date && dateStr > s.end_date) return false
    return matchesFrequency(s, date)
  })

  if (matchingSeries) {
    return {
      status:      matchingSeries.status,
      notes:       matchingSeries.notes,
      series_id:   matchingSeries.id,
      is_exception: false,
      source:      'series',
    }
  }

  return { status: 'not_set', source: 'none' }
}

function matchesFrequency(series, date) {
  if (series.frequency === 'weekly') return true
  if (series.frequency === 'biweekly') {
    const weeks = differenceInCalendarWeeks(date, parseISO(series.start_date), { weekStartsOn: 1 })
    return weeks % 2 === 0
  }
  if (series.frequency === 'monthly') {
    const seriesStart       = parseISO(series.start_date)
    const weekOfMonthStart  = Math.ceil(getDate(seriesStart) / 7)
    const weekOfMonthCurrent = Math.ceil(getDate(date) / 7)
    return weekOfMonthStart === weekOfMonthCurrent
  }
  return true
}

export function useSlots(mediatorId, dateFrom, dateTo) {
  return useQuery({
    queryKey: ['slots', mediatorId, dateFrom, dateTo],
    enabled:  !!mediatorId && !!dateFrom && !!dateTo,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('mediator_id', mediatorId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
      if (error) throw error
      return data
    },
  })
}

export function useRecurringSeries(mediatorId) {
  return useQuery({
    queryKey: ['series', mediatorId],
    enabled:  !!mediatorId,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('recurring_series')
        .select('*')
        .eq('mediator_id', mediatorId)
        .eq('is_active', true)
      if (error) throw error
      return data
    },
  })
}

export function useProvisionalBookings(mediatorId) {
  return useQuery({
    queryKey:        ['provisional', mediatorId],
    enabled:         !!mediatorId,
    refetchInterval: 10_000,
    queryFn:         async () => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('id, date, period, status, notes, case_id, created_by, group_id')
        .eq('mediator_id', mediatorId)
        .eq('status', 'provisionally_booked')
        .order('date', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

const MAKE_WEBHOOK = 'https://hook.eu1.make.com/2hgf5r8zc3n18tkewgn7emsg02zl46sp'

// Mediator/clerk: batch upsert N slots with the same status (slots remain independent)
export function useBatchUpsertSlots() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mediatorId, slots, status, notes }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id
      await Promise.all(
        slots.map(({ dateStr, period }) =>
          supabase.from('availability_slots').upsert({
            mediator_id:  mediatorId,
            date:         dateStr,
            period,
            status,
            notes:        notes || null,
            updated_by:   userId,
            created_by:   userId,
            group_id:     null,
          }, { onConflict: 'mediator_id,date,period' })
        )
      )
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['slots',       mediatorId] })
      qc.invalidateQueries({ queryKey: ['provisional', mediatorId] })
    },
  })
}

function buildSlotSummary(slots) {
  if (!slots.length) return ''
  const sorted = [...slots].sort((a, b) => a.dateStr.localeCompare(b.dateStr))
  const first  = sorted[0].dateStr
  const last   = sorted[sorted.length - 1].dateStr
  const n      = slots.length
  if (first === last) return `${first} (${n} slot${n > 1 ? 's' : ''})`
  return `${first} – ${last} (${n} slots)`
}

// CRA: batch create provisional bookings with a shared group_id
export function useBatchCreateProvisionalBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mediatorId, slots, sendEmail, message, hubspotMediatorId }) => {
      const userId  = (await supabase.auth.getUser()).data.user?.id
      const groupId = crypto.randomUUID()

      await Promise.all(
        slots.map(({ dateStr, period }) =>
          supabase.from('availability_slots').upsert({
            mediator_id:  mediatorId,
            date:         dateStr,
            period,
            status:       'provisionally_booked',
            group_id:     groupId,
            created_by:   userId,
            updated_by:   userId,
          }, { onConflict: 'mediator_id,date,period' })
        )
      )

      const sorted = [...slots].sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      await fetch(MAKE_WEBHOOK, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          event:                      'request_slot_availability',
          mediator_id:                mediatorId,
          hubspot_mediator_object_id: hubspotMediatorId || null,
          group_id:                   groupId,
          slots:                      sorted.map(s => ({ date: s.dateStr, slot_time: s.period })),
          slot_summary:               buildSlotSummary(sorted),
          send_email:                 sendEmail,
          message:                    message || null,
        }),
      }).catch(() => {})
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['slots',       mediatorId] })
      qc.invalidateQueries({ queryKey: ['provisional', mediatorId] })
    },
  })
}

export function useUpsertSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mediatorId, date, period, status, notes, seriesId, isException }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id
      const { data, error } = await supabase
        .from('availability_slots')
        .upsert({
          mediator_id:  mediatorId,
          date,
          period,
          status,
          notes:        notes || null,
          series_id:    seriesId || null,
          is_exception: isException || false,
          updated_by:   userId,
          created_by:   userId,
        }, { onConflict: 'mediator_id,date,period' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['slots',       mediatorId] })
      qc.invalidateQueries({ queryKey: ['provisional', mediatorId] })
    },
  })
}

// CRA-specific: create a provisional booking with optional email notification
export function useCreateProvisionalBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mediatorId, date, period, fullDay, sendEmail, message, hubspotMediatorId }) => {
      const userId   = (await supabase.auth.getUser()).data.user?.id
      const periods  = fullDay ? ['morning', 'afternoon'] : [period]

      for (const p of periods) {
        const { error } = await supabase
          .from('availability_slots')
          .upsert({
            mediator_id:  mediatorId,
            date,
            period:       p,
            status:       'provisionally_booked',
            notes:        null,
            series_id:    null,
            is_exception: false,
            updated_by:   userId,
            created_by:   userId,
          }, { onConflict: 'mediator_id,date,period' })
        if (error) throw error
      }

      // Fire Make webhook
      await fetch(MAKE_WEBHOOK, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          event:                      'request_slot_availability',
          mediator_id:                mediatorId,
          hubspot_mediator_object_id: hubspotMediatorId || null,
          slot_date:                  date,
          slot_time:                  fullDay ? 'full_day' : period,
          send_email:                 sendEmail,
          message:                    message || null,
        }),
      }).catch(() => {}) // non-blocking
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['slots',       mediatorId] })
      qc.invalidateQueries({ queryKey: ['provisional', mediatorId] })
    },
  })
}

// Delete an explicit slot entirely
export function useDeleteSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ slotId, mediatorId }) => {
      const { error } = await supabase
        .from('availability_slots')
        .delete()
        .eq('id', slotId)
      if (error) throw error
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['slots',       mediatorId] })
      qc.invalidateQueries({ queryKey: ['provisional', mediatorId] })
    },
  })
}

// Mark a single occurrence of a series as deleted (inserts a 'deleted' exception)
export function useDeleteSeriesException() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mediatorId, date, period, seriesId }) => {
      const { error } = await supabase
        .from('availability_slots')
        .upsert({
          mediator_id:  mediatorId,
          date,
          period,
          status:       'deleted',
          series_id:    seriesId,
          is_exception: true,
        }, { onConflict: 'mediator_id,date,period' })
      if (error) throw error
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['slots', mediatorId] })
    },
  })
}

// Deactivate all series occurrences from a given date onwards (sets end_date = date - 1)
export function useDeactivateSeriesFrom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ seriesId, mediatorId, fromDate }) => {
      const endDate = format(subDays(parseISO(fromDate), 1), 'yyyy-MM-dd')
      const { error } = await supabase
        .from('recurring_series')
        .update({ end_date: endDate })
        .eq('id', seriesId)
      if (error) throw error
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['series', mediatorId] })
      qc.invalidateQueries({ queryKey: ['slots',  mediatorId] })
    },
  })
}

export function useRespondToBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ slotId, mediatorId, action, extraPayload = {} }) => {
      if (action === 'accept') {
        const { error } = await supabase
          .from('availability_slots')
          .update({ status: 'confirmed' })
          .eq('id', slotId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('availability_slots')
          .delete()
          .eq('id', slotId)
        if (error) throw error
      }

      // Webhook fires for both accept and decline
      const webhookUrl = import.meta.env.VITE_MAKE_BOOKING_WEBHOOK
                      || 'https://hook.eu1.make.com/2hgf5r8zc3n18tkewgn7emsg02zl46sp'
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            event:       action === 'accept'
                           ? 'provisional_booking_confirmed'
                           : 'provisional_booking_declined',
            mediator_id: mediatorId,
            slot_id:     slotId,
            ...extraPayload,
          }),
        }).catch(() => {})
      }
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['slots',       mediatorId] })
      qc.invalidateQueries({ queryKey: ['provisional', mediatorId] })
    },
  })
}

export function useCreateSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (seriesData) => {
      const { data, error } = await supabase
        .from('recurring_series')
        .insert(seriesData)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { mediator_id }) => {
      qc.invalidateQueries({ queryKey: ['series', mediator_id] })
    },
  })
}
