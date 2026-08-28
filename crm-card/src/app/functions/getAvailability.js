// getAvailability.js — HubSpot App Function (platform 2026.03)
// Runs server-side. Secrets set via: hs secret add SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL         = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function supabaseGet(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  return res.json()
}

exports.main = async (context = {}, sendResponse) => {
  try {
    const { hs_object_id, date_from, date_to } = context.parameters

    if (!hs_object_id) {
      return sendResponse({ status: 'ERROR', message: 'Missing hs_object_id' })
    }

    // 1. Find mediator by HubSpot record ID
    const mediators = await supabaseGet('users', {
      hubspot_mediator_object_id: `eq.${hs_object_id}`,
      select: 'id,full_name,email',
      limit:  '1',
    })

    if (!mediators.length) {
      return sendResponse({
        status:  'ERROR',
        message: `No portal account linked to HubSpot record ${hs_object_id}.`,
      })
    }

    const mediator = mediators[0]

    // 2. Fetch slots for date range
    const slotsUrl = new URL(`${SUPABASE_URL}/rest/v1/availability_slots`)
    slotsUrl.searchParams.set('mediator_id', `eq.${mediator.id}`)
    slotsUrl.searchParams.set('date',        `gte.${date_from}`)
    slotsUrl.searchParams.set('select',      'id,date,period,status,notes,series_id,is_exception')
    slotsUrl.searchParams.set('order',       'date.asc')

    const slotsRes = await fetch(slotsUrl.toString(), {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    })
    const allSlots = await slotsRes.json()
    const slots    = Array.isArray(allSlots) ? allSlots.filter(s => s.date <= date_to) : []

    // 3. Fetch active recurring series
    const series = await supabaseGet('recurring_series', {
      mediator_id: `eq.${mediator.id}`,
      is_active:   'eq.true',
      select:      'id,day_of_week,period,status,frequency,start_date,end_date,notes',
    })

    sendResponse({
      status: 'SUCCESS',
      body: {
        mediator: { id: mediator.id, full_name: mediator.full_name, email: mediator.email },
        slots,
        series: Array.isArray(series) ? series : [],
      },
    })
  } catch (err) {
    sendResponse({ status: 'ERROR', message: err.message })
  }
}
