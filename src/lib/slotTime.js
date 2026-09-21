// CEDR slot time constants (Europe/London)
export const AM = { start: '08:00', end: '12:00' }
export const PM = { start: '14:00', end: '18:00' }

/**
 * Returns '+01:00' (BST) or '+00:00' (GMT) for a given date string.
 * At noon UTC, London shows 13h in BST and 12h in GMT.
 */
export function getUKOffset(dateStr) {
  const d = new Date(`${dateStr}T12:00:00.000Z`)
  const londonHour = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: 'numeric',
      hour12: false,
    }).format(d),
    10
  )
  return londonHour === 13 ? '+01:00' : '+00:00'
}

/**
 * Builds slot_start / slot_end ISO strings for a given date + period.
 *   buildSlotTimestamps('2026-09-15', 'morning')
 *   → { slot_start: '2026-09-15T08:00:00+01:00', slot_end: '2026-09-15T12:00:00+01:00' }
 */
export function buildSlotTimestamps(dateStr, period) {
  const offset = getUKOffset(dateStr)
  const times  = period === 'morning' ? AM : PM
  return {
    slot_start: `${dateStr}T${times.start}:00${offset}`,
    slot_end:   `${dateStr}T${times.end}:00${offset}`,
  }
}

/**
 * Derives period from an hour number (0-23, Europe/London).
 * < 13 → 'morning', ≥ 13 → 'afternoon'  (mirrors the DB GENERATED column)
 */
export function periodFromHour(hour) {
  return hour < 13 ? 'morning' : 'afternoon'
}
