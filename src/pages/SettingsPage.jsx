import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Pencil, Settings, Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Fetch case_type enum options directly from HubSpot via Edge Function
function useHubSpotCaseTypeOptions() {
  return useQuery({
    queryKey:  ['hs-case-type-options'],
    staleTime: 5 * 60 * 1000,
    queryFn:   async () => {
      const { data, error } = await supabase.functions.invoke('get-deal-property-options', {
        body: { property_name: 'case_type', object_type: 'deals' },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data.options || [] // [{ label, value }]
    },
  })
}

// Fetch current app mappings from Supabase
function useCaseTypeLabels() {
  return useQuery({
    queryKey:  ['case-type-labels'],
    staleTime: 0,
    queryFn:   async () => {
      const { data, error } = await supabase
        .from('case_type_labels')
        .select('api_value, display_label')
      if (error) throw error
      const map = {}
      for (const row of (data || [])) map[row.api_value] = row.display_label
      return map // { [api_value]: display_label }
    },
  })
}

export default function SettingsPage() {
  const qc = useQueryClient()
  const { data: hsOptions = [], isLoading: loadingHS, error: hsError } = useHubSpotCaseTypeOptions()
  const { data: labelMap  = {}, isLoading: loadingLabels }             = useCaseTypeLabels()

  const [editing,   setEditing]   = useState(null)  // api_value (hs value) being edited
  const [editValue, setEditValue] = useState('')
  const [saving,    setSaving]    = useState(false)

  async function handleSave(hsValue) {
    setSaving(true)
    await supabase.from('case_type_labels').upsert({
      api_value:     hsValue,
      display_label: editValue.trim(),
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'api_value' })
    await qc.invalidateQueries({ queryKey: ['case-type-labels'] })
    setEditing(null)
    setSaving(false)
  }

  const isLoading = loadingHS || loadingLabels

  return (
    <div className="flex-1 overflow-auto p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings size={18} className="text-cedr-navy" />
        <h1 className="text-lg font-semibold text-cedr-navy">Settings</h1>
      </div>

      <div className="bg-white rounded-lg border border-cedr-border overflow-hidden">
        <div className="px-5 py-4 border-b border-cedr-border bg-cedr-light/40">
          <p className="text-sm font-semibold text-cedr-navy">Case Type Labels</p>
          <p className="text-xs text-cedr-muted mt-0.5">
            Values come from HubSpot. Set the label shown to mediators and clerks in the app.
            CRAs and admins always see the raw HubSpot value.
          </p>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_1fr_1fr_48px] px-5 py-2 border-b border-cedr-border bg-cedr-light/20">
          <span className="text-[11px] font-semibold text-cedr-muted uppercase tracking-wide">HubSpot Label</span>
          <span className="text-[11px] font-semibold text-cedr-muted uppercase tracking-wide">HubSpot Value</span>
          <span className="text-[11px] font-semibold text-cedr-muted uppercase tracking-wide">App Display</span>
          <span />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-cedr-muted" />
          </div>
        ) : hsError ? (
          <div className="flex items-center gap-2 px-5 py-6 text-red-600">
            <AlertTriangle size={15} className="shrink-0" />
            <p className="text-sm">{hsError?.message || String(hsError)}</p>
          </div>
        ) : hsOptions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-cedr-muted">No options found for case_type.</p>
        ) : (
          hsOptions.map(opt => {
            const currentLabel = labelMap[opt.value] || ''
            const isEditing    = editing === opt.value
            return (
              <div key={opt.value}
                className="grid grid-cols-[1fr_1fr_1fr_48px] items-center px-5 py-3 border-b border-cedr-border/60 last:border-b-0 hover:bg-cedr-light/20 transition-colors">
                {/* HubSpot label */}
                <span className="text-sm text-cedr-text">{opt.label}</span>
                {/* HubSpot internal value */}
                <span className="text-xs font-mono text-cedr-muted">{opt.value}</span>
                {/* App display — editable */}
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSave(opt.value)
                        if (e.key === 'Escape') setEditing(null)
                      }}
                      className="input text-sm py-1 flex-1"
                      placeholder="Display label…"
                    />
                    <button onClick={() => handleSave(opt.value)} disabled={saving}
                      className="p-1 rounded text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors">
                      <Check size={13} />
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="p-1 rounded text-cedr-muted hover:bg-cedr-light transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <span className={currentLabel ? 'text-sm text-cedr-navy' : 'text-sm text-cedr-muted/40 italic'}>
                    {currentLabel || 'Not set'}
                  </span>
                )}
                {/* Edit button */}
                {!isEditing && (
                  <button
                    onClick={() => { setEditing(opt.value); setEditValue(currentLabel) }}
                    className="p-1.5 rounded text-cedr-muted hover:text-cedr-navy hover:bg-cedr-light transition-colors mx-auto">
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
