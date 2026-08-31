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
    if (!HS_TOKEN) {
      return { status: 'ERROR', message: 'HUBSPOT_API_TOKEN secret not set' }
    }

    const isDeal = object_type === 'deal'

    // Fetch ALL properties to identify the correct internal names
    const res = await fetch(
      `${HS_BASE}/crm/v3/objects/${isDeal ? 'deals' : 'tickets'}/${hs_object_id}?properties=dealname,enquiry_id,subject,enquiry_number_auto_generated`,
      { headers: { 'Authorization': `Bearer ${HS_TOKEN}` } }
    )

    if (!res.ok) {
      const txt = await res.text()
      return { status: 'ERROR', message: `HubSpot API ${res.status}: ${txt}` }
    }

    const data = await res.json()
    const props = data.properties || {}

    const case_id     = isDeal ? props.enquiry_id : props.enquiry_number_auto_generated
    const record_name = isDeal ? props.dealname   : props.subject

    return {
      status: 'SUCCESS',
      body: {
        case_id:      case_id     || null,
        record_name:  record_name || null,
        record_id:    hs_object_id,
        object_type,
        // Temporary debug — remove before go-live
        _all_props:   props,
      },
    }
  } catch (err) {
    return { status: 'ERROR', message: err.message }
  }
}
