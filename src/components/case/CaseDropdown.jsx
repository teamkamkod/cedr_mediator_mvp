import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, Briefcase, Ticket } from 'lucide-react'
import { clsx } from 'clsx'
import { supabase } from '../../lib/supabase'
import { useCase } from '../../lib/CaseContext'

function CaseBadge({ object_type }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide shrink-0',
      object_type === 'deal'
        ? 'bg-blue-100 text-blue-700 border border-blue-200'
        : 'bg-gray-100 text-gray-600 border border-gray-200'
    )}>
      {object_type === 'deal' ? <Briefcase size={8} /> : <Ticket size={8} />}
      {object_type === 'deal' ? 'Case' : 'Enquiry'}
    </span>
  )
}

export default function CaseDropdown({ onChange }) {
  const { selectedCase, setSelectedCase, isFromCRM } = useCase()
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const [error,    setError]    = useState(null)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  // Notify parent on change
  useEffect(() => { onChange?.(selectedCase) }, [selectedCase])

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.trim().length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase.functions.invoke('search-hubspot-cases', {
          body: { query: query.trim() }
        })
        if (error) throw error
        setResults(data || [])
        setOpen(true)
      } catch (err) {
        setError('Search failed — please try again')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function select(item) {
    setSelectedCase(item)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  function clear() {
    setSelectedCase(null)
    setQuery('')
    setResults([])
  }

  // Read-only badge when opened from CRM card
  if (isFromCRM && selectedCase) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-cedr-muted uppercase tracking-wide">Case</p>
        <div className="flex items-center gap-2 px-3 py-2.5 bg-cedr-light border border-cedr-border rounded">
          <CaseBadge object_type={selectedCase.object_type} />
          <span className="text-sm font-medium text-cedr-navy truncate">{selectedCase.record_name}</span>
          <span className="text-xs text-cedr-muted ml-auto shrink-0">{selectedCase.case_id}</span>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="space-y-1">
      <p className="text-xs font-medium text-cedr-muted uppercase tracking-wide">
        Case / Enquiry <span className="text-red-500 ml-0.5">*</span>
      </p>

      {/* Selected state */}
      {selectedCase ? (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 border border-purple-200 rounded">
          <CaseBadge object_type={selectedCase.object_type} />
          <span className="text-sm font-medium text-purple-800 truncate flex-1">{selectedCase.record_name}</span>
          <span className="text-xs text-purple-600 shrink-0">{selectedCase.case_id}</span>
          <button onClick={clear} className="text-purple-400 hover:text-purple-700 transition-colors shrink-0">
            <X size={13} />
          </button>
        </div>
      ) : (
        /* Search input */
        <div className="relative">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-3 text-cedr-muted/60 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by case ID or name…"
              className="input text-xs pl-8 pr-8 w-full"
            />
            {loading && (
              <Loader2 size={13} className="absolute right-3 text-cedr-muted animate-spin pointer-events-none" />
            )}
          </div>

          {/* Dropdown */}
          {open && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-cedr-border rounded-lg shadow-popover max-h-52 overflow-y-auto">
              {error ? (
                <p className="px-3 py-3 text-xs text-red-500">{error}</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-3 text-xs text-cedr-muted">No results found</p>
              ) : results.map(item => (
                <button key={`${item.object_type}-${item.record_id}`}
                  onClick={() => select(item)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-cedr-light transition-colors text-left border-b border-cedr-border/50 last:border-b-0">
                  <CaseBadge object_type={item.object_type} />
                  <span className="text-sm text-cedr-navy font-medium truncate flex-1">{item.record_name}</span>
                  <span className="text-xs text-cedr-muted shrink-0">{item.case_id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
