import { createContext, useContext, useState } from 'react'

const CalendarContext = createContext(null)

export function CalendarProvider({ children }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view,        setView]        = useState('week')

  const [showWeekends, setShowWeekendsState] = useState(
    () => localStorage.getItem('cedr_show_weekends') !== 'false'
  )

  function setShowWeekends(val) {
    setShowWeekendsState(val)
    localStorage.setItem('cedr_show_weekends', String(val))
  }

  return (
    <CalendarContext.Provider value={{ currentDate, setCurrentDate, view, setView, showWeekends, setShowWeekends }}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const ctx = useContext(CalendarContext)
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider')
  return ctx
}
