import { useState } from 'react'
import { X, Bell, Check } from 'lucide-react'

const MAKE_WEBHOOK = 'https://hook.eu1.make.com/2hgf5r8zc3n18tkewgn7emsg02zl46sp'

export default function RequestUpdateModal({ mediatorName, hubspotMediatorId, mediatorId, onClose }) {
  const [state, setState] = useState('confirm')
  const [error, setError] = useState(null)

  async function handleConfirm() {
    setState('sending')
    try {
      await fetch(MAKE_WEBHOOK, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          event:                      'request_availability_update',
          mediator_id:                mediatorId,
          hubspot_mediator_object_id: hubspotMediatorId,
        }),
      })
      setState('sent')
      setTimeout(onClose, 2000)
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-popover border border-cedr-border w-80 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-cedr-border">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-cedr-navy" />
            <p className="text-sm font-semibold text-cedr-navy">Request availability update</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={14} className="text-cedr-muted" />
          </button>
        </div>
        <div className="p-5">
          {state === 'confirm' && (
            <>
              <p className="text-sm text-cedr-muted mb-5 leading-relaxed">
                This will send an email notification to <strong>{mediatorName}</strong> asking them to log in and update their availability calendar.
              </p>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={handleConfirm} className="btn-primary flex-1 text-sm">Send request</button>
              </div>
            </>
          )}
          {state === 'sending' && (
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="w-4 h-4 border-2 border-cedr-navy border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-cedr-muted">Sending…</p>
            </div>
          )}
          {state === 'sent' && (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={18} className="text-green-600" />
              </div>
              <p className="text-sm font-medium text-cedr-navy">Request sent</p>
              <p className="text-xs text-cedr-muted">{mediatorName} will receive an email shortly.</p>
            </div>
          )}
          {state === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-red-600">Failed to send: {error}</p>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary flex-1 text-sm">Close</button>
                <button onClick={handleConfirm} className="btn-primary flex-1 text-sm">Retry</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
