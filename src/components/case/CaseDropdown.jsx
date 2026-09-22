import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCase } from '../../lib/CaseContext'

/**
 * CaseDropdown — can run in two modes:
 *   Controlled:   pass value={localCase} onChange={setLocalCase}  — ignores context
 *   Context-driven: omit value prop — reads/writes CaseContext
 */
export default function CaseDropdown({ onChange, value: externalValue }) {
  const { selectedCase: ctxCase, setSelectedCase, isFromCRM } = useCase()

  // Controlled when value prop is explicitly provided (even if null)
  const controlled    = externalValue !== undefined
  const currentCase   = controlled ? externalValue : ctxCase

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)
  const [error,   setError]   = useState(null)
  const debounceRef    = useRef(null)
  const containerRef   = useRef(null)

  useEffect(() => {
    if (!controlled) onChange?.(ctxCase)
  }, [ctxCase])

  useEffect(() => {
    function handle(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.trim().length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true); setError(null)
      try {
        const { data, error } = await supabase.functions.invoke('search-hubspot-cases', {
          body: { query: query.trim() }
        })
        if (error) throw error
        setResults(data || []); setOpen(true)
      } catch {
        setError('Search failed — please try again'); setResults([])
      } finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function select(item) {
    if (!controlled) setSelectedCase(item)
    onChange?.(item)
    setQuery(''); setResults([]); setOpen(false)
  }

  function clear() {
    if (!controlled) setSelectedCase(null)
    onChange?.(null)
    setQuery(''); setResults([])
  }

  // Read-only when from CRM
  if (isFromCRM && currentCase) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-cedr-muted uppercase tracking-wide">Case</p>
        <div className="flex items-center gap-2 px-3 py-2.5 bg-cedr-light border border-cedr-border rounded">
          <span className="text-sm font-medium text-cedr-navy truncate">{currentCase.record_name}</span>
          <span className="text-xs text-cedr-muted ml-auto shrink-0">{currentCase.case_id}</span>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="space-y-1">
      <p className="text-xs font-medium text-cedr-muted uppercase tracking-wide">
        Case / Enquiry <span className="text-red-500 ml-0.5">*</span>
      </p>

      {currentCase ? (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 border border-purple-200 rounded">
          <span className="text-sm font-medium text-purple-800 truncate flex-1">{currentCase.record_name}</span>
          <span className="text-xs text-purple-600 shrink-0">{currentCase.case_id}</span>
          {!isFromCRM && (
            <button onClick={clear} className="text-purple-400 hover:text-purple-700 transition-colors shrink-0">
              <X size={13} />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-3 text-cedr-muted/60 pointer-events-none" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by case ID or name…" className="input text-xs pl-8 pr-8 w-full" />
            {loading && <Loader2 size={13} className="absolute right-3 text-cedr-muted animate-spin pointer-events-none" />}
          </div>
          {open && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-cedr-border rounded-lg shadow-popover max-h-52 overflow-y-auto">
              {error ? (
                <p className="px-3 py-3 text-xs text-red-500">{error}</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-3 text-xs text-cedr-muted">No results found</p>
              ) : results.map(item => (
                <button key={`${item.object_type}-${item.record_id}`} onClick={() => select(item)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-cedr-light transition-colors text-left border-b border-cedr-border/50 last:border-b-0">
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
