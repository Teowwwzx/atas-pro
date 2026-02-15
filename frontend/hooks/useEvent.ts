
'use client'

import useSWR from 'swr'
import api, {
  createEvent,
  joinPublicEvent,
  leaveEvent,
  bulkInviteEventParticipants,
  generateAttendanceQR,

  scanAttendance,
  setEventReminder,
  getEventChecklist,
  createEventChecklistItem,
  updateEventChecklistItem,
  deleteEventChecklistItem,
} from '@/services/api'
import {
  EventCreate,
  EventDetails,
  EventParticipantBulkCreate,
  AttendanceScanRequest,
  EventReminderCreate,
  MyEventItem,
  EventChecklistItemCreate,
  EventChecklistItemUpdate,
} from '@/services/api.types'

const fetcher = (url: string) => api.get(url).then(res => res.data)

export function usePublicEvents() {
  const { data, error, isLoading, mutate } = useSWR<EventDetails[]>(
    '/events',
    fetcher,
  )
  return { events: data, error, isLoading, mutate }
}

export function useEvent(eventId: string | null) {
  const key = eventId ? `/events/${eventId}` : null
  const { data, error, isLoading, mutate } = useSWR<EventDetails>(key, fetcher)
  return { event: data, error, isLoading, mutate }
}

export function useMyEvents() {
  const { data, error, isLoading, mutate } = useSWR<MyEventItem[]>(
    '/events/mine',
    fetcher,
  )
  return { items: data, error, isLoading, mutate }
}

export const eventActions = {
  create: (body: EventCreate) => createEvent(body),
  join: (eventId: string) => joinPublicEvent(eventId),
  leave: (eventId: string) => leaveEvent(eventId),
  bulkInvite: (eventId: string, body: EventParticipantBulkCreate) =>
    bulkInviteEventParticipants(eventId, body),
  generateQR: (eventId: string) => generateAttendanceQR(eventId),
  scanAttendance: (eventId: string, token: string) => scanAttendance(eventId, token),
  setReminder: (eventId: string, body: EventReminderCreate) =>
    setEventReminder(eventId, body),
  checklist: {
    list: (eventId: string) => getEventChecklist(eventId),
    create: (eventId: string, body: EventChecklistItemCreate) =>
      createEventChecklistItem(eventId, body),
    update: (
      eventId: string,
      itemId: string,
      body: EventChecklistItemUpdate,
    ) => updateEventChecklistItem(eventId, itemId, body),
    remove: (eventId: string, itemId: string) =>
      deleteEventChecklistItem(eventId, itemId),
  },
}
