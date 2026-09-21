import { Info } from 'lucide-react'

/**
 * Green "ⓘ More info" badge. Click opens DealInfoModal via onInfoClick callback.
 * Usage: <InfoBadge recordId={slot.hubspot_record_id} recordName={slot.record_name} onInfoClick={setDealModal} />
 */
export default function InfoBadge({ recordId, recordName, onInfoClick, className = '' }) {
  if (!recordId) return null
  return (
    <button
      onClick={e => { e.stopPropagation(); onInfoClick({ recordId, recordName }) }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500 hover:bg-green-600 text-white transition-colors ${className}`}
      title="View case details">
      <Info size={9} />
      More info
    </button>
  )
}
