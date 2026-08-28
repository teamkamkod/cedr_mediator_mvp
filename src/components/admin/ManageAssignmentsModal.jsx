import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { useMediators, useClerkAssignments, useSaveAssignments } from '../../hooks/useAssignments'
import MediatorCheckboxList from './MediatorCheckboxList'

export default function ManageAssignmentsModal({ clerk, onClose }) {
  const { data: mediators = [],  isLoading: loadingMediators } = useMediators()
  const { data: currentIds = [], isLoading: loadingCurrent }   = useClerkAssignments(clerk.id)

  // selected initialises ONLY once currentIds has finished loading
  const [selected, setSelected] = useState(null)
  const [saved, setSaved]       = useState(false)
  const save = useSaveAssignments()

  useEffect(() => {
    if (!loadingCurrent) {
      setSelected([...currentIds])
    }
  }, [loadingCurrent, clerk.id]) // re-init if clerk changes or loading finishes

  async function handleSave() {
    if (selected === null) return
    await save.mutateAsync({
      clerkId:             clerk.id,
      newMediatorIds:      selected,
      previousMediatorIds: currentIds,
    })
    setSaved(true)
    setTimeout(onClose, 1200)
  }

  const isLoading  = loadingMediators || loadingCurrent || selected === null
  const hasChanged = selected !== null &&
    JSON.stringify([...selected].sort()) !== JSON.stringify([...currentIds].sort())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-popover border border-cedr-border w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cedr-border">
          <div>
            <h2 className="text-base font-semibold text-cedr-navy">Mediator assignments</h2>
            <p className="text-xs text-cedr-muted mt-0.5">{clerk.full_name} · {clerk.email}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={15} className="text-cedr-muted" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {saved ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={18} className="text-green-600" />
              </div>
              <p className="text-sm font-medium text-cedr-navy">Assignments updated</p>
            </div>

          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
            </div>

          ) : (
            <>
              <p className="text-sm text-cedr-muted">
                Select which mediators this clerk can manage.
                {selected.length === 0 && (
                  <span className="text-amber-600 font-medium">
                    {' '}No mediators assigned — clerk won't be able to access any calendar.
                  </span>
                )}
              </p>

              <MediatorCheckboxList
                mediators={mediators}
                selected={selected}
                onChange={setSelected}
              />

              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={save.isPending || !hasChanged}
                  className="btn-primary flex-1"
                >
                  {save.isPending ? 'Saving…' : 'Save assignments'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
