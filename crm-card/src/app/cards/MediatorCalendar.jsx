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

function toDateStr(d) {
  return d.toISOString().slice(0, 10)
}

function getMondayOfWeek(offset = 0) {
  const today  = new Date()
  const day    = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - day + 1 + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getWeekDays(offset = 0) {
  const monday = getMondayOfWeek(offset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDay(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatWeekRange(days) {
  const s = days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const e = days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${s} – ${e}`
}

function matchesFrequency(series, date) {
  if (series.frequency === 'weekly') return true
  if (series.frequency === 'biweekly') {
    const start     = new Date(series.start_date)
    const msPerWeek = 7 * 24 * 60 * 60 * 1000
    const weeks     = Math.round((date - start) / msPerWeek)
    return weeks % 2 === 0
  }
  if (series.frequency === 'monthly') {
    const start  = new Date(series.start_date)
    return Math.ceil(start.getDate() / 7) === Math.ceil(date.getDate() / 7)
  }
  return true
}

function resolveSlot(date, period, slots, series) {
  const dateStr  = toDateStr(date)
  const explicit = slots.find(s => s.date === dateStr && s.period === period)
  if (explicit) {
    if (explicit.status === 'deleted') return { status: 'not_set' }
    return explicit
  }
  const rawDay    = date.getDay()
  const dayOfWeek = rawDay === 0 ? 6 : rawDay - 1
  const match     = series.find(s => {
    if (s.day_of_week !== dayOfWeek) return false
    if (s.period !== period)         return false
    if (dateStr < s.start_date)      return false
    if (s.end_date && dateStr > s.end_date) return false
    return matchesFrequency(s, date)
  })
  if (match) return { status: match.status, notes: match.notes }
  return { status: 'not_set' }
}

function SlotTag({ slot, label }) {
  const cfg = STATUS[slot.status] || STATUS.not_set
  if (slot.status === 'not_set') {
    return <Text variant="microcopy">{label}: —</Text>
  }
  return (
    <Flex direction="column" gap="extra-small">
      <Tag variant={cfg.variant}>{label}: {cfg.label}</Tag>
      {slot.notes && <Text variant="microcopy">{slot.notes}</Text>}
    </Flex>
  )
}

hubspot.extend(({ context, runServerlessFunction }) => (
  <MediatorCalendar context={context} runServerlessFunction={runServerlessFunction} />
))

function MediatorCalendar({ context, runServerlessFunction }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [requested,  setRequested]  = useState(false)

  const hs_object_id = context.crm.objectId
  const days         = getWeekDays(weekOffset)
  const date_from    = toDateStr(days[0])
  const date_to      = toDateStr(days[6])

  useEffect(() => { fetchData() }, [weekOffset])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const resp = await runServerlessFunction({
        name:       'getAvailability',
        parameters: { hs_object_id: String(hs_object_id), date_from, date_to },
      })
      if (resp.status === 'SUCCESS') {
        setData(resp.response.body)
      } else {
        setError(resp.message || 'Failed to load availability.')
      }
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function handleRequestUpdate() {
    try {
      await hubspot.fetch('https://hook.eu1.make.com/2hgf5r8zc3n18tkewgn7emsg02zl46sp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ hs_object_id, mediator_id: data?.mediator?.id }),
      })
    } catch (_) {}
    setRequested(true)
    setTimeout(() => setRequested(false), 4000)
  }

  if (loading) return (
    <Flex justify="center" align="center" gap="small">
      <LoadingSpinner />
      <Text>Loading availability…</Text>
    </Flex>
  )

  if (error) return (
    <Flex direction="column" gap="small">
      <Alert title="Could not load availability" variant="error">{error}</Alert>
      <Button onClick={fetchData} variant="secondary" size="xs">Retry</Button>
    </Flex>
  )

  const slots  = data?.slots  || []
  const series = data?.series || []

  return (
    <Flex direction="column" gap="small">
      <Heading>{data?.mediator?.full_name || 'Mediator'} — Availability</Heading>

      <Flex align="center" gap="small">
        <Button onClick={() => setWeekOffset(o => o - 1)} variant="secondary" size="xs">← Prev</Button>
        <Box flex={1}>
          <Text format={{ bold: true }} align="center">{formatWeekRange(days)}</Text>
        </Box>
        <Button onClick={() => setWeekOffset(o => o + 1)} variant="secondary" size="xs">Next →</Button>
        <Button onClick={() => setWeekOffset(0)} variant="secondary" size="xs">Today</Button>
      </Flex>

      <Divider />

      <Flex direction="column" gap="extra-small">
        {days.map(day => {
          const dateStr = toDateStr(day)
          const isToday = dateStr === toDateStr(new Date())
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

      <Divider />

      <Flex direction="row" gap="extra-small" wrap="wrap">
        {Object.entries(STATUS).filter(([k]) => k !== 'not_set').map(([k, cfg]) => (
          <Tag key={k} variant={cfg.variant}>{cfg.label}</Tag>
        ))}
      </Flex>

      <Divider />

      <Flex justify="space-between" align="center">
        <Button onClick={fetchData} variant="secondary" size="xs">Refresh</Button>
        <Button onClick={handleRequestUpdate} variant="primary" size="xs" disabled={requested}>
          {requested ? 'Request sent ✓' : 'Request availability update'}
        </Button>
      </Flex>
    </Flex>
  )
}
