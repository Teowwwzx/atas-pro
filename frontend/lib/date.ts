import { intervalToDuration, formatDuration } from 'date-fns'

export function formatEventDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return 'TBC'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return 'TBC'
  const dayPart = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const weekdayPart = date.toLocaleDateString('en-GB', { weekday: 'short' })
  return `${dayPart} (${weekdayPart})`
}

export function formatEventTimeRange(
  startInput: Date | string | null | undefined,
  endInput: Date | string | null | undefined
): string {
  if (!startInput || !endInput) return 'TBC'
  const start = typeof startInput === 'string' ? new Date(startInput) : startInput
  const end = typeof endInput === 'string' ? new Date(endInput) : endInput
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'TBC'
  const timeStart = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const timeEnd = end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const duration = intervalToDuration({ start, end })
  const durationStrRaw = formatDuration(duration, { format: ['hours', 'minutes'], delimiter: ' ' })
  const durationStr = durationStrRaw
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .trim()
  const hasDuration = (duration.hours || 0) > 0 || (duration.minutes || 0) > 0
  const finalDuration = hasDuration ? durationStr : '0m'
  return `${timeStart} - ${timeEnd} • ${finalDuration}`
}
