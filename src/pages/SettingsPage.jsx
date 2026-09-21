import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Plus, Pencil, Trash2, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'

function useCaseTypeLabels() {
  return useQuery({
    queryKey:  ['case-type-labels'],
    staleTime: 0,
    queryFn:   async () => {
      const { data, error } = await supabase
        .from('case_type_labels')
        .select('api_value, display_label')
        .order('api_value')
      if (error) throw error
      return data || []
    },
  })
}

export default function SettingsPage() {
  const qc = useQueryClient()
  const { data: labels = [], isLoading } = useCaseTypeLabels()

  const [editing,    setEditing]    = useState(null)  // api_value being edited
  const [editValue,  setEditValue]  = useState('')    // new display_label
  const [adding,     setAdding]     = useState(false)
  const [newApi,     setNewApi]     = useState('')
  const [newDisplay, setNewDisplay] = useState('')
  const [saving,     setSaving]     = useState(false)

  async function handleSaveEdit(apiValue) {
    setSaving(true)
    await supabase.from('case_type_labels')
      .update({ display_label: editValue, updated_at: new Date().toISOString() })
      .eq('api_value', apiValue)
    qc.invalidateQueries({ queryKey: ['case-type-labels'] })
    setEditing(null)
    setSaving(false)
  }

  async function handleAdd() {
    if (!newApi.trim() || !newDisplay.trim()) return
    setSaving(true)
    await supabase.from('case_type_labels').upsert({
      api_value:     newApi.trim(),
      display_label: newDisplay.trim(),
    })
    qc.invalidateQueries({ queryKey: ['case-type-labels'] })
    setAdding(false)
    setNewApi('')
    setNewDisplay('')
    setSaving(false)
  }

  async function handleDelete(apiValue) {
    if (!confirm(`Delete mapping for "${apiValue}"?`)) return
    await supabase.from('case_type_labels').delete().eq('api_value', apiValue)
    qc.invalidateQueries({ queryKey: ['case-type-labels'] })
  }

  return (
    <div className="flex-1 overflow-auto p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings size={18} className="text-cedr-navy" />
        <h1 className="text-lg font-semibold text-cedr-navy">Settings</h1>
      </div>

      {/* Case Type Labels */}
      <div className="bg-white rounded-lg border border-cedr-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-cedr-border bg-cedr-light/40">
          <div>
            <p className="text-sm font-semibold text-cedr-navy">Case Type Labels</p>
            <p className="text-xs text-cedr-muted mt-0.5">Maps HubSpot API values to display labels in the app</p>
          </div>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 btn-secondary text-xs px-3 py-1.5">
            <Plus size={12} />Add
          </button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_80px] border-b border-cedr-border bg-cedr-light/20 px-5 py-2">
          <span className="text-[11px] font-semibold text-cedr-muted uppercase tracking-wide">HubSpot API Value</span>
          <span className="text-[11px] font-semibold text-cedr-muted uppercase tracking-wide">Display in App</span>
          <span />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {labels.map(row => (
              <div key={row.api_value}
                className="grid grid-cols-[1fr_1fr_80px] items-center px-5 py-3 border-b border-cedr-border/60 last:border-b-0 hover:bg-cedr-light/20 transition-colors">
                <span className="text-sm font-mono text-cedr-text">{row.api_value}</span>
                {editing === row.api_value ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(row.api_value); if (e.key === 'Escape') setEditing(null) }}
                      className="input text-sm py-1 flex-1"
                    />
                    <button onClick={() => handleSaveEdit(row.api_value)} disabled={saving}
                      className="p-1 rounded text-green-600 hover:bg-green-50 transition-colors">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="p-1 rounded text-cedr-muted hover:bg-cedr-light transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-cedr-navy">{row.display_label}</span>
                )}
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={() => { setEditing(row.api_value); setEditValue(row.display_label) }}
                    className="p-1.5 rounded text-cedr-muted hover:text-cedr-navy hover:bg-cedr-light transition-colors">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(row.api_value)}
                    className="p-1.5 rounded text-cedr-muted hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add row */}
            {adding && (
              <div className="grid grid-cols-[1fr_1fr_80px] items-center gap-2 px-5 py-3 border-t border-cedr-border bg-cedr-light/30">
                <input autoFocus value={newApi} onChange={e => setNewApi(e.target.value)}
                  placeholder="API value" className="input text-sm py-1" />
                <input value={newDisplay} onChange={e => setNewDisplay(e.target.value)}
                  placeholder="Display label"
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
                  className="input text-sm py-1" />
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={handleAdd} disabled={saving || !newApi.trim() || !newDisplay.trim()}
                    className="p-1.5 rounded text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setAdding(false)}
                    className="p-1.5 rounded text-cedr-muted hover:bg-cedr-light transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
