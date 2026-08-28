export const SLOT_STATUSES = {
  available:          { label: 'Available',           color: 'bg-green-100 text-green-800 border-green-200',  dot: 'bg-status-available'  },
  unavailable:        { label: 'Unavailable',         color: 'bg-red-100 text-red-800 border-red-200',        dot: 'bg-status-unavailable'},
  ask_me:             { label: 'Ask Me',              color: 'bg-amber-100 text-amber-800 border-amber-200',  dot: 'bg-status-ask_me'     },
  provisionally_booked:{ label: 'Prov. Booked',      color: 'bg-purple-100 text-purple-800 border-purple-200',dot: 'bg-status-provisional'},
  confirmed:          { label: 'Confirmed',           color: 'bg-cyan-100 text-cyan-800 border-cyan-200',     dot: 'bg-status-confirmed'  },
  not_set:            { label: 'Not set',             color: 'bg-gray-100 text-gray-500 border-gray-200',     dot: 'bg-status-not_set'    },
}

export const EDITABLE_STATUSES = ['available', 'unavailable', 'ask_me']

export const PERIODS = ['morning', 'afternoon']

export const RECURRENCE_FREQUENCIES = [
  { value: 'weekly',    label: 'Every week'       },
  { value: 'biweekly',  label: 'Every 2 weeks'    },
  { value: 'monthly',   label: 'Same day monthly'  },
]

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Monday'    },
  { value: 1, label: 'Tuesday'   },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday'  },
  { value: 4, label: 'Friday'    },
  { value: 5, label: 'Saturday'  },
  { value: 6, label: 'Sunday'    },
]
