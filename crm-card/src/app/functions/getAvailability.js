const SUPABASE_URL  = 'https://kvmvgezohrrrutkxhzit.supabase.co'
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bXZnZXpvaHJycnV0a3hoeml0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzg3ODEwMiwiZXhwIjoyMTAzNDU0MTAyfQ.AIcCJH6-ZsUzJqivkzWOrzQoHBwwPIVi9b6iGl6CVqo'

const HEADERS = {
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
}

async function get(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { headers: HEADERS })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res.json()
}

exports.main = async (context = {}) => {
  try {
    const { hs_object_id, date_from, date_to } = context.parameters

    const mediators = await get('users', {
      hubspot_mediator_object_id: `eq.${hs_object_id}`,
      select: 'id,full_name,email',
      limit:  '1',
    })

    if (!mediators.length) {
      return { status: 'ERROR', message: `No match for hs_object_id=${hs_object_id}` }
    }

    const mediator = mediators[0]

    const slotsUrl = new URL(`${SUPABASE_URL}/rest/v1/availability_slots`)
    slotsUrl.searchParams.set('mediator_id', `eq.${mediator.id}`)
    slotsUrl.searchParams.set('date',        `gte.${date_from}`)
    slotsUrl.searchParams.set('select',      'id,date,period,status,notes,series_id,is_exception')
    slotsUrl.searchParams.set('order',       'date.asc')
    slotsUrl.searchParams.set('limit',       '2000')

    const slotsRes = await fetch(slotsUrl.toString(), { headers: HEADERS })
    const allSlots = await slotsRes.json()
    const slots    = Array.isArray(allSlots) ? allSlots.filter(s => s.date <= date_to) : []

    const series = await get('recurring_series', {
      mediator_id: `eq.${mediator.id}`,
      is_active:   'eq.true',
      select:      'id,day_of_week,period,status,frequency,start_date,end_date,notes',
    })

    return {
      status: 'SUCCESS',
      body: {
        mediator: { id: mediator.id, full_name: mediator.full_name, email: mediator.email },
        slots,
        series: Array.isArray(series) ? series : [],
      },
    }
  } catch (err) {
    return { status: 'ERROR', message: err.message }
  }
}
