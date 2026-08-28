// getAvailability.js — HubSpot App Function (platform 2026.03)
// Runs server-side. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// must be set as secrets in the HubSpot private app settings.

const SUPABASE_URL        = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function supabaseGet(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
    },
  })
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`)
  return res.json()
}

exports.main = async (context = {}, sendResponse) => {
  try {
    const { hs_object_id, date_from, date_to } = context.parameters

    if (!hs_object_id) {
      return sendResponse({ status: 'ERROR', message: 'Missing hs_object_id' })
    }

    // 1. Look up mediator by HubSpot custom object record ID
    const mediators = await supabaseGet('users', {
      hubspot_mediator_object_id: `eq.${hs_object_id}`,
      select: 'id,full_name,first_name,last_name,email,avatar_url',
      limit: '1',
    })

    if (!mediators.length) {
      return sendResponse({
        status: 'ERROR',
        message: 'No portal account linked to this mediator record. Set hubspot_mediator_object_id on the user profile.',
      })
    }

    const mediator = mediators[0]

    // 2. Fetch availability slots for the date range
    const slots = await supabaseGet('availability_slots', {
      mediator_id: `eq.${mediator.id}`,
      date:        `gte.${date_from}`,
      'date':      `lte.${date_to}`,
      select:      'id,date,period,status,notes,series_id,is_exception',
      order:       'date.asc',
    })

    // Note: Supabase REST doesn't support multiple filters on the same column easily.
    // Use range filter properly:
    const slotsFiltered = await (async () => {
      const url = new URL(`${SUPABASE_URL}/rest/v1/availability_slots`)
      url.searchParams.set('mediator_id', `eq.${mediator.id}`)
      url.searchParams.set('date', `gte.${date_from}`)
      url.searchParams.set('select', 'id,date,period,status,notes,series_id,is_exception')
      url.searchParams.set('order', 'date.asc')

      const res = await fetch(url.toString(), {
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Range-Unit':    'items',
          'Prefer':        'count=none',
        },
      })
      const data = await res.json()
      // Filter date_to client-side to avoid double param issue
      return Array.isArray(data) ? data.filter(s => s.date <= date_to) : []
    })()

    // 3. Fetch active recurring series
    const series = await supabaseGet('recurring_series', {
      mediator_id: `eq.${mediator.id}`,
      is_active:   'eq.true',
      select:      'id,day_of_week,period,status,frequency,start_date,end_date,notes',
    })

    sendResponse({
      status: 'SUCCESS',
      body: {
        mediator: {
          id:        mediator.id,
          full_name: mediator.full_name,
          email:     mediator.email,
        },
        slots:  slotsFiltered,
        series: Array.isArray(series) ? series : [],
      },
    })
  } catch (err) {
    sendResponse({ status: 'ERROR', message: err.message })
  }
}
