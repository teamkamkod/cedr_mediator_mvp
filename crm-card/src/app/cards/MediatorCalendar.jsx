import React, { useState, useEffect } from 'react'
import {
  Flex, Box, Text, Heading, Button, Tag, Divider,
  LoadingSpinner, Alert, hubspot,
} from '@hubspot/ui-extensions'

const STATUS = {
  available:            { label: 'Available',    variant: 'success'  },
  unavailable:          { label: 'Unavailable',  variant: 'error'    },
  ask_me:               { label: 'Ask Me',       variant: 'warning'  },
  provisionally_booked: { label: 'Prov. Booked', variant: 'purple'   },
  confirmed:            { label: 'Confirmed',    variant: 'info'     },
  not_set:              { label: '',             variant: 'default'  },
}

function toUTCDateStr(d) { return d.toISOString().slice(0, 10) }

function todayUTC() {
  const n = new Date()
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth()+1).padStart(2,'0')}-${String(n.getUTCDate()).padStart(2,'0')}`
}

function getMondayUTC(offset = 0) {
  const now = new Date()
  const day = now.getUTCDay() || 7
  const m   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  m.setUTCDate(m.getUTCDate() - day + 1 + offset * 7)
  return m
}

function getWeekDaysUTC(offset = 0) {
  const monday = getMondayUTC(offset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    return d
  })
}

function formatDay(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function formatWeekRange(days) {
  const s = days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const e = days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  return `${s} – ${e}`
}

function matchesFrequency(s, date) {
  if (s.frequency === 'weekly') return true
  if (s.frequency === 'biweekly') {
    const weeks = Math.round((date - new Date(s.start_date)) / (7*24*60*60*1000))
    return weeks % 2 === 0
  }
  if (s.frequency === 'monthly') {
    const start = new Date(s.start_date)
    return Math.ceil(start.getUTCDate()/7) === Math.ceil(date.getUTCDate()/7)
  }
  return true
}

function resolveSlot(date, period, slots, series) {
  const dateStr  = toUTCDateStr(date)
  const explicit = slots.find(s => s.date === dateStr && s.period === period)
  if (explicit) return explicit.status === 'deleted' ? { status: 'not_set' } : explicit
  const rawDay    = date.getUTCDay()
  const dayOfWeek = rawDay === 0 ? 6 : rawDay - 1
  const match     = series.find(s =>
    s.day_of_week === dayOfWeek && s.period === period &&
    dateStr >= s.start_date && (!s.end_date || dateStr <= s.end_date) &&
    matchesFrequency(s, date)
  )
  return match ? { status: match.status, notes: match.notes } : { status: 'not_set' }
}

function findNextAvailable(slots, series) {
  const today = new Date()
  for (let i = 0; i < 90; i++) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i))
    for (const period of ['morning', 'afternoon']) {
      const slot = resolveSlot(date, period, slots, series)
      if (slot.status === 'available') {
        return {
          label:  date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }),
          period: period === 'morning' ? 'AM' : 'PM',
        }
      }
    }
  }
  return null
}

function SlotTag({ slot, label }) {
  const cfg = STATUS[slot.status] || STATUS.not_set
  if (slot.status === 'not_set') return <Text variant="microcopy">{label}: —</Text>
  return (
    <Flex direction="column" gap="extra-small">
      <Tag variant={cfg.variant}>{label}: {cfg.label}</Tag>
      {slot.notes && <Text variant="microcopy">{slot.notes}</Text>}
    </Flex>
  )
}

hubspot.extend(({ context, runServerlessFunction, actions }) => (
  <MediatorCalendar context={context} runServerlessFunction={runServerlessFunction} actions={actions} />
))

function MediatorCalendar({ context, runServerlessFunction, actions }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const hs_object_id = context.crm.objectId
  const today        = todayUTC()

  useEffect(() => {
    const monday  = getMondayUTC(0)
    const yearEnd = new Date(monday)
    yearEnd.setUTCDate(yearEnd.getUTCDate() + 364)

    runServerlessFunction({
      name:       'get-availability-function',
      parameters: {
        hs_object_id: String(hs_object_id),
        date_from:    toUTCDateStr(monday),
        date_to:      toUTCDateStr(yearEnd),
      },
    }).then(resp => {
      if (resp.status === 'SUCCESS') setData(resp.response.body)
      else setError(resp.response?.message || JSON.stringify(resp))
    }).catch(e => setError(e.message))
    .finally(() => setLoading(false))
  }, [])

  function handleOpenFullCalendar() {
    const mediatorId = data?.mediator?.id || ''
    actions.openIframeModal({
      uri:    `https://cedr-mediator-mvp.team-cd8.workers.dev/?mediator_id=${mediatorId}`,
      height: 2000,
      width:  1400,
      title:  `${data?.mediator?.full_name || 'Mediator'} — Full Calendar`,
      flush:  false,
    })
  }

  const days   = getWeekDaysUTC(weekOffset)
  const slots  = data?.slots  || []
  const series = data?.series || []

  if (loading) return (
    <Flex justify="center" align="center" gap="small">
      <LoadingSpinner /><Text>Loading availability…</Text>
    </Flex>
  )

  if (error) return (
    <Alert title="Could not load availability" variant="error">{error}</Alert>
  )

  const nextAvailable = findNextAvailable(slots, series)

  return (
    <Flex direction="column" gap="small">

      {/* Header */}
      <Flex justify="space-between" align="center">
        <Heading>{data?.mediator?.full_name || 'Mediator'} — Availability</Heading>
        <Button onClick={handleOpenFullCalendar} variant="primary" size="xs">
          Open full calendar
        </Button>
      </Flex>

      {/* Next available */}
      {nextAvailable ? (
        <Flex align="center" gap="extra-small">
          <Text variant="microcopy">Next available:</Text>
          <Tag variant="success">{nextAvailable.label} {nextAvailable.period}</Tag>
        </Flex>
      ) : (
        <Text variant="microcopy">No availability set in the next 90 days</Text>
      )}

      <Divider />

      {/* Week navigation */}
      <Flex align="center" gap="small">
        <Button onClick={() => setWeekOffset(o => o-1)} variant="secondary" size="xs">← Prev</Button>
        <Box flex={1}>
          <Text format={{ bold: true }} align="center">{formatWeekRange(days)}</Text>
        </Box>
        <Button onClick={() => setWeekOffset(o => o+1)} variant="secondary" size="xs">Next →</Button>
        <Button onClick={() => setWeekOffset(0)} variant="secondary" size="xs">Today</Button>
      </Flex>

      <Divider />

      {/* Week slots */}
      <Flex direction="column" gap="extra-small">
        {days.map(day => {
          const dateStr = toUTCDateStr(day)
          const isToday = dateStr === today
          const am      = resolveSlot(day, 'morning',   slots, series)
          const pm      = resolveSlot(day, 'afternoon', slots, series)
          const empty   = am.status === 'not_set' && pm.status === 'not_set'
          return (
            <Box key={dateStr} padding="small">
              <Flex direction="column" gap="extra-small">
                <Text format={{ bold: true }}>
                  {formatDay(day)}{isToday ? ' (Today)' : ''}
                </Text>
                {empty
                  ? <Text variant="microcopy">No availability set</Text>
                  : <Flex direction="row" gap="medium">
                      <SlotTag slot={am} label="AM" />
                      <SlotTag slot={pm} label="PM" />
                    </Flex>
                }
              </Flex>
            </Box>
          )
        })}
      </Flex>

    </Flex>
  )
}
