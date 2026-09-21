import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { differenceInCalendarWeeks, parseISO, getDay, getDate, format, subDays, eachDayOfInterval } from 'date-fns'
import { buildSlotTimestamps } from '../lib/slotTime'

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

// Returns the most recent updated_at across availability_slots (excl. pencilled/provisional/confirmed)
// and recurring_series for a given mediator — used by CRA to gauge how fresh the calendar is.
export function useLastCalendarUpdate(mediatorId) {
  return useQuery({
    queryKey:  ['last-calendar-update', mediatorId],
    enabled:   !!mediatorId,
    staleTime: 60 * 1000, // 1 min
    queryFn:   async () => {
      const [slotsRes, seriesRes] = await Promise.all([
        supabase
          .from('availability_slots')
          .select('updated_at')
          .eq('mediator_id', mediatorId)
          .in('status', ['available', 'unavailable', 'ask_me'])
          .order('updated_at', { ascending: false })
          .limit(1),
        supabase
          .from('recurring_series')
          .select('updated_at')
          .eq('mediator_id', mediatorId)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1),
      ])

      const slotDate   = slotsRes.data?.[0]?.updated_at  ? new Date(slotsRes.data[0].updated_at)  : null
      const seriesDate = seriesRes.data?.[0]?.updated_at ? new Date(seriesRes.data[0].updated_at) : null

      if (!slotDate && !seriesDate) return null
      if (!slotDate)   return seriesDate
      if (!seriesDate) return slotDate
      return slotDate > seriesDate ? slotDate : seriesDate
    },
  })
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
        .select('id, date, period, status, notes, case_id, created_by, group_id, hubspot_record_id, hubspot_object_type, record_name')
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
        slots.map(({ dateStr, period }) => {
          const { slot_start, slot_end } = buildSlotTimestamps(dateStr, period)
          return supabase.from('availability_slots').upsert({
            mediator_id:  mediatorId,
            date:         dateStr,
            slot_start,
            slot_end,
            status,
            notes:        notes || null,
            updated_by:   userId,
            created_by:   userId,
            group_id:     null,
          }, { onConflict: 'mediator_id,slot_start' })
        })
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
    mutationFn: async ({ mediatorId, slots, sendEmail, message, hubspotMediatorId, caseData }) => {
      const userId  = (await supabase.auth.getUser()).data.user?.id
      const groupId = crypto.randomUUID()

      await Promise.all(
        slots.map(({ dateStr, period }) => {
          const { slot_start, slot_end } = buildSlotTimestamps(dateStr, period)
          return supabase.from('availability_slots').upsert({
            mediator_id:          mediatorId,
            date:                 dateStr,
            slot_start,
            slot_end,
            status:               'provisionally_booked',
            group_id:             groupId,
            created_by:           userId,
            updated_by:           userId,
            case_id:              caseData?.case_id     || null,
            hubspot_record_id:    caseData?.record_id   || null,
            hubspot_object_type:  caseData?.object_type || null,
            record_name:          caseData?.record_name || null,
          }, { onConflict: 'mediator_id,slot_start' })
        })
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
          case_id:                    caseData?.case_id     || null,
          hubspot_record_id:          caseData?.record_id   || null,
          hubspot_object_type:        caseData?.object_type || null,
          record_name:                caseData?.record_name || null,
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
      const { slot_start, slot_end } = buildSlotTimestamps(date, period)
      const { data, error } = await supabase
        .from('availability_slots')
        .upsert({
          mediator_id:  mediatorId,
          date,
          slot_start,
          slot_end,
          status,
          notes:        notes || null,
          series_id:    seriesId || null,
          is_exception: isException || false,
          updated_by:   userId,
          created_by:   userId,
        }, { onConflict: 'mediator_id,slot_start' })
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
    mutationFn: async ({ mediatorId, date, period, fullDay, sendEmail, message, hubspotMediatorId, caseData }) => {
      const userId   = (await supabase.auth.getUser()).data.user?.id
      const periods  = fullDay ? ['morning', 'afternoon'] : [period]

      for (const p of periods) {
        const { slot_start, slot_end } = buildSlotTimestamps(date, p)
        const { error } = await supabase
          .from('availability_slots')
          .upsert({
            mediator_id:         mediatorId,
            date,
            slot_start,
            slot_end,
            status:              'provisionally_booked',
            notes:               null,
            series_id:           null,
            is_exception:        false,
            updated_by:          userId,
            created_by:          userId,
            case_id:             caseData?.case_id     || null,
            hubspot_record_id:   caseData?.record_id   || null,
            hubspot_object_type: caseData?.object_type || null,
            record_name:         caseData?.record_name || null,
          }, { onConflict: 'mediator_id,slot_start' })
        if (error) throw error
      }

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
          case_id:                    caseData?.case_id     || null,
          hubspot_record_id:          caseData?.record_id   || null,
          hubspot_object_type:        caseData?.object_type || null,
          record_name:                caseData?.record_name || null,
        }),
      }).catch(() => {})
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

// CRA: create a pencilled slot linked to a case
export function usePencilSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mediatorId, date, period, fullDay, caseData, hubspotMediatorId }) => {
      const userId  = (await supabase.auth.getUser()).data.user?.id
      const periods = fullDay ? ['morning', 'afternoon'] : [period]

      for (const p of periods) {
        const { slot_start, slot_end } = buildSlotTimestamps(date, p)
        const { error } = await supabase.from('availability_slots').upsert({
          mediator_id:         mediatorId,
          date,
          slot_start,
          slot_end,
          status:              'pencilled',
          notes:               null,
          series_id:           null,
          is_exception:        false,
          created_by:          userId,
          updated_by:          userId,
          case_id:             caseData?.case_id     || null,
          hubspot_record_id:   caseData?.record_id   || null,
          hubspot_object_type: caseData?.object_type || null,
          record_name:         caseData?.record_name || null,
        }, { onConflict: 'mediator_id,slot_start' })
        if (error) throw error
      }

      await fetch(MAKE_WEBHOOK, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          event:                      'slot_pencilled',
          mediator_id:                mediatorId,
          hubspot_mediator_object_id: hubspotMediatorId || null,
          slot_date:                  date,
          slot_time:                  fullDay ? 'full_day' : period,
          case_id:                    caseData?.case_id     || null,
          hubspot_record_id:          caseData?.record_id   || null,
          hubspot_object_type:        caseData?.object_type || null,
          record_name:                caseData?.record_name || null,
        }),
      }).catch(() => {})
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['slots', mediatorId] })
    },
  })
}

// Mark a single occurrence of a series as deleted (inserts a 'deleted' exception)
export function useDeleteSeriesException() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mediatorId, date, period, seriesId }) => {
      const { slot_start, slot_end } = buildSlotTimestamps(date, period)
      const { error } = await supabase
        .from('availability_slots')
        .upsert({
          mediator_id:  mediatorId,
          date,
          slot_start,
          slot_end,
          status:       'deleted',
          series_id:    seriesId,
          is_exception: true,
        }, { onConflict: 'mediator_id,slot_start' })
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
      // Convert period → series_slot_start / series_slot_end
      const { period, ...rest } = seriesData
      const series_slot_start = period === 'morning' ? '08:00:00' : '14:00:00'
      const series_slot_end   = period === 'morning' ? '12:00:00' : '18:00:00'
      const { data, error } = await supabase
        .from('recurring_series')
        .insert({ ...rest, series_slot_start, series_slot_end })
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

// Bulk upsert all slots in a date range with a given status.
// Skips slots already provisionally_booked or confirmed.
export function useBulkUpsertPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mediatorId, startDate, endDate, status, includeWeekends }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id

      // 1. Fetch existing blocked slots in range
      const { data: existing } = await supabase
        .from('availability_slots')
        .select('date, period')
        .eq('mediator_id', mediatorId)
        .gte('date', startDate)
        .lte('date', endDate)
        .in('status', ['provisionally_booked', 'confirmed'])

      const blocked = new Set((existing || []).map(s => `${s.date}-${s.period}`))

      // 2. Generate all dates in range, optionally filter weekends
      const dates = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
        .filter(d => includeWeekends || (d.getDay() !== 0 && d.getDay() !== 6))

      // 3. Build upsert records with slot timestamps, skip blocked
      const records = []
      for (const d of dates) {
        const dateStr = format(d, 'yyyy-MM-dd')
        for (const period of ['morning', 'afternoon']) {
          if (blocked.has(`${dateStr}-${period}`)) continue
          const { slot_start, slot_end } = buildSlotTimestamps(dateStr, period)
          records.push({
            mediator_id:  mediatorId,
            date:         dateStr,
            slot_start,
            slot_end,
            status,
            notes:        null,
            series_id:    null,
            is_exception: false,
            updated_by:   userId,
            created_by:   userId,
          })
        }
      }

      if (records.length === 0) return { count: 0, skipped: blocked.size }

      // 4. Batch upsert in one call
      const { error } = await supabase
        .from('availability_slots')
        .upsert(records, { onConflict: 'mediator_id,slot_start' })
      if (error) throw error

      return { count: records.length, skipped: blocked.size }
    },
    onSuccess: (_, { mediatorId }) => {
      qc.invalidateQueries({ queryKey: ['slots', mediatorId] })
    },
  })
}
