import { X, Calendar, Clock, Bell, RefreshCw, Users } from 'lucide-react'
import { useAuth } from '../../lib/auth'

const CONTENT = {
  mediator: {
    title: 'How to use your availability calendar',
    sections: [
      {
        icon: Calendar,
        heading: 'Set your availability',
        body: 'Click any AM or PM slot on the calendar to mark it as Available, Unavailable, or Ask Me. Use the Full day toggle to set both at once.',
      },
      {
        icon: RefreshCw,
        heading: 'Recurring slots',
        body: 'When setting a slot, choose Recurring to apply it every week, every 2 weeks, or monthly. You can edit or delete recurring slots individually or all at once.',
      },
      {
        icon: Bell,
        heading: 'Booking requests',
        body: 'When CEDR provisionally books you for a mediation, a banner appears at the top. Accept or Decline directly from the banner.',
      },
    ],
  },
  clerk: {
    title: 'Managing mediator availability',
    sections: [
      {
        icon: Users,
        heading: 'Switch between mediators',
        body: 'If you manage multiple mediators, use the ↺ button in the sidebar to switch. Your selection is remembered until you close the browser.',
      },
      {
        icon: Calendar,
        heading: 'Updating the calendar',
        body: 'You can set, edit, and delete availability slots on behalf of the mediator you\'re managing. All changes are saved immediately.',
      },
      {
        icon: Bell,
        heading: 'Booking notifications',
        body: 'The mediator\'s pending booking requests appear in the banner at the top of their calendar. You can accept or decline on their behalf.',
      },
    ],
  },
}

export default function HelpModal({ onClose }) {
  const { isMediator, isClerk } = useAuth()
  const content = isClerk ? CONTENT.clerk : CONTENT.mediator

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-popover border border-cedr-border w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-cedr-border">
          <h2 className="text-base font-semibold text-cedr-navy">{content.title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-cedr-light">
            <X size={15} className="text-cedr-muted" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {content.sections.map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 bg-cedr-light rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <s.icon size={15} className="text-cedr-navy" />
              </div>
              <div>
                <p className="text-sm font-semibold text-cedr-navy mb-0.5">{s.heading}</p>
                <p className="text-sm text-cedr-muted leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <p className="text-xs text-cedr-muted text-center">
            Questions? Contact <a href="mailto:mediations@cedr.com" className="underline">mediations@cedr.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
