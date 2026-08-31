import { createContext, useContext, useState, useEffect } from 'react'

const CaseContext = createContext(null)

export function CaseProvider({ children }) {
  const [selectedCase, setSelectedCase] = useState(null)
  const [isFromCRM,    setIsFromCRM]    = useState(false)

  // Read URL params on mount — set when opened from HubSpot CRM card iframe
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const caseId    = params.get('case_id')
    const recordId  = params.get('record_id')
    const objType   = params.get('object_type')
    const recName   = params.get('record_name')
    if (caseId && recordId && objType) {
      setSelectedCase({
        case_id:             caseId,
        record_id:           recordId,
        object_type:         objType,
        record_name:         recName || caseId,
      })
      setIsFromCRM(true)
    }
  }, [])

  return (
    <CaseContext.Provider value={{ selectedCase, setSelectedCase, isFromCRM }}>
      {children}
    </CaseContext.Provider>
  )
}

export function useCase() {
  const ctx = useContext(CaseContext)
  if (!ctx) throw new Error('useCase must be used within CaseProvider')
  return ctx
}
