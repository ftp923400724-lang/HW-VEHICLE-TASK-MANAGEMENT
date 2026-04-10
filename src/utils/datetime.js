// Format Date to local YYYY-MM-DD HH:mm:ss string (no timezone shift)
export function formatDateTimeLocal(date) {
  if (!(date instanceof Date)) {
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return ''
    date = parsed
  }
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num) => num.toString().padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

// Normalize any value to a Date instance; returns null on invalid
export function toDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
