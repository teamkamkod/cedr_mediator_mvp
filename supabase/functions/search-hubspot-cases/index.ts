import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const HS_TOKEN = Deno.env.get('HUBSPOT_API_TOKEN')!
const HS_BASE  = 'https://api.hubapi.com'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function makeFilters(propertyName: string, value: string, isId: boolean) {
  if (isId) {
    return [
      { filters: [{ propertyName, operator: 'EQ', value }] },
      { filters: [{ propertyName, operator: 'CONTAINS_TOKEN', value }] },
    ]
  }
  return [{ filters: [{ propertyName, operator: 'CONTAINS_TOKEN', value }] }]
}

async function hsSearch(objectType: string, filterGroups: unknown[], properties: string[]) {
  const res = await fetch(`${HS_BASE}/crm/v3/objects/${objectType}/search`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${HS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filterGroups, properties, limit: 20 }),
  })
  if (!res.ok) throw new Error(`HubSpot ${objectType} search ${res.status}`)
  return res.json()
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
    const q = (query || '').trim()
    if (q.length < 2) {
      return new Response(JSON.stringify([]), { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const [ticketsRes, dealsRes] = await Promise.all([
      hsSearch('tickets', [
        ...makeFilters('enquiry_number_auto_generated', q, true),
        ...makeFilters('subject', q, false),
      ], ['subject', 'enquiry_number_auto_generated']),
      hsSearch('deals', [
        ...makeFilters('enquiry_id', q, true),
        ...makeFilters('dealname', q, false),
      ], ['dealname', 'enquiry_id']),
    ])

    const map: Record<string, { object_type: string; case_id: string; record_name: string; record_id: string }> = {}

    for (const t of (ticketsRes.results || [])) {
      const caseId = t.properties?.enquiry_number_auto_generated
      if (!caseId) continue
      map[caseId] = { object_type: 'ticket', case_id: caseId, record_name: t.properties?.subject || `Ticket ${t.id}`, record_id: t.id }
    }
    for (const d of (dealsRes.results || [])) {
      const caseId = d.properties?.enquiry_id
      if (!caseId) continue
      map[caseId] = { object_type: 'deal', case_id: caseId, record_name: d.properties?.dealname || `Deal ${d.id}`, record_id: d.id }
    }

    return new Response(JSON.stringify(Object.values(map).slice(0, 20)), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }
})
