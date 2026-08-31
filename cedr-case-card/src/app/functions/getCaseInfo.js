// getCaseInfo.js — App Function for CEDR Case Card
// Secret required: hs secret add HUBSPOT_API_TOKEN

const HS_TOKEN = process.env.HUBSPOT_API_TOKEN
const HS_BASE  = 'https://api.hubapi.com'

exports.main = async (context = {}) => {
  try {
    const { hs_object_id, object_type } = context.parameters

    if (!hs_object_id || !object_type) {
      return { status: 'ERROR', message: 'Missing hs_object_id or object_type' }
    }

    const isDeal = object_type === 'deal'
    const props  = isDeal
      ? 'dealname,enquiry_id'
      : 'subject,enquiry_number_auto_generated'

    const res = await fetch(
      `${HS_BASE}/crm/v3/objects/${isDeal ? 'deals' : 'tickets'}/${hs_object_id}?properties=${props}`,
      { headers: { 'Authorization': `Bearer ${HS_TOKEN}` } }
    )

    if (!res.ok) {
      return { status: 'ERROR', message: `HubSpot API ${res.status}` }
    }

    const data = await res.json()

    const case_id     = isDeal ? data.properties?.enquiry_id : data.properties?.enquiry_number_auto_generated
    const record_name = isDeal ? data.properties?.dealname   : data.properties?.subject

    return {
      status: 'SUCCESS',
      body: {
        case_id:     case_id     || null,
        record_name: record_name || null,
        record_id:   hs_object_id,
        object_type,
      },
    }
  } catch (err) {
    return { status: 'ERROR', message: err.message }
  }
}
