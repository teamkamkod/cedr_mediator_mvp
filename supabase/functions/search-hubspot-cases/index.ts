import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const HS_TOKEN  = Deno.env.get('HUBSPOT_API_TOKEN')!
const HS_BASE   = 'https://api.hubapi.com'
const PIPELINE  = '764352937'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchDeals() {
  const results: Array<{object_type: string; case_id: string; record_name: string; record_id: string}> = []
  let after: string | undefined = undefined

  while (results.length < 200) {
    const body: Record<string, unknown> = {
      filterGroups: [{
        filters: [
          { propertyName: 'pipeline',          operator: 'EQ',           value: PIPELINE },
          { propertyName: 'enquiry_id_string', operator: 'HAS_PROPERTY'                  },
        ],
      }],
      properties: ['enquiry_id_string', 'dealname'],
      limit: 100,
    }
    if (after) body.after = after

    const res = await fetch(`${HS_BASE}/crm/v3/objects/deals/search`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${HS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) break
    const data = await res.json()

    for (const d of (data.results || [])) {
      const caseId = d.properties?.enquiry_id_string
      if (!caseId) continue
      results.push({
        object_type: 'deal',
        case_id:     caseId,
        record_name: d.properties?.dealname || `Deal ${d.id}`,
        record_id:   d.id,
      })
    }

    if (data.paging?.next?.after) after = data.paging.next.after
    else break
  }
  return results
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: CORS })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: CORS })

    const { query } = await req.json()
    const q = (query || '').trim().toLowerCase()

    const deals = await fetchDeals()
    const results = q.length >= 2
      ? deals.filter(d =>
          d.case_id.toLowerCase().includes(q) ||
          d.record_name.toLowerCase().includes(q)
        )
      : deals

    return new Response(JSON.stringify(results.slice(0, 20)), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }
})
