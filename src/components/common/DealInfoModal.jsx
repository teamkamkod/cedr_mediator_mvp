import { useState, useEffect } from 'react'
import { X, Loader2, AlertTriangle, Info } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { supabase } from '../../lib/supabase'

function Field({ label, value }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-cedr-border/50 last:border-b-0">
      <span className="text-xs font-semibold text-cedr-muted w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-cedr-navy">{value || <span className="text-cedr-muted/50">—</span>}</span>
    </div>
  )
}

function formatDate(val) {
  if (!val) return null
  try {
    // HubSpot returns dates as YYYY-MM-DD or epoch ms strings
    const d = isNaN(Number(val)) ? parseISO(val) : new Date(Number(val))
    return format(d, 'd MMM yyyy')
  } catch { return val }
}

function formatTime(val) {
  if (!val) return null
  if (typeof val === 'string' && val.includes(':')) return val.slice(0, 5)
  try { return format(new Date(Number(val)), 'HH:mm') } catch { return val }
}

export default function DealInfoModal({ recordId, recordName, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    supabase.functions.invoke('get-deal-info', { body: { record_id: recordId } })
      .then(({ data, error }) => {
        if (error)        setError(error.message)
        else if (data?.error) setError(data.error)
        else              setData(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [recordId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-lg border border-cedr-border w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cedr-border bg-cedr-light/50">
          <div className="flex items-center gap-2 min-w-0">
            <Info size={15} className="text-cedr-navy shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-cedr-navy truncate">{recordName || 'Case Details'}</p>
              {data?.poc_name && (
                <p className="text-xs text-cedr-muted mt-0.5">POC: {data.poc_name}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light shrink-0 ml-2">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-cedr-muted" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 py-6 text-red-600">
              <AlertTriangle size={15} className="shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <>
              <Field label="Case Reference #"  value={data?.enquiry_id} />
              <Field label="Case Type"         value={data?.case_type} />
              <Field label="Date of Mediation" value={formatDate(data?.date)} />
              <Field label="Start Time"        value={formatTime(data?.start_time)} />
              <Field label="End Time"          value={formatTime(data?.end_time)} />
              <Field label="Location"          value={data?.location} />
              <Field label="Venue Address"     value={data?.venue_address} />
            </>
          )}
        </div>

        <div className="px-5 pb-4 pt-2">
          <button onClick={onClose} className="btn-secondary w-full text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}
