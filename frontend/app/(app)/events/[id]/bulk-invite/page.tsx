"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventById, getEventParticipants, bulkInviteEventParticipants } from '@/services/api'
import type { EventDetails, EventParticipantCreate, EventParticipantDetails } from '@/services/api.types'
import { useUser } from '@/hooks/useUser'

export default function BulkInvitePage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id
  const router = useRouter()
  const { user } = useUser()
  const [event, setEvent] = useState<EventDetails | null>(null)
  const [participants, setParticipants] = useState<EventParticipantDetails[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteItems, setInviteItems] = useState<EventParticipantCreate[]>([{ user_id: '', role: 'audience' }])
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (!eventId) return
      try {
        const data = await getEventById(eventId as string)
        setEvent(data)
        try {
          const parts = await getEventParticipants(eventId as string)
          setParticipants(parts)
        } catch {
          setParticipants(null)
        }
      } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any)?.response?.data?.detail || 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [eventId])

  const canInvite = (() => {
    if (!event || !user) return false
    if (event.organizer_id === user.user_id) return true
    if (!participants) return false
    return participants.some(p => p.user_id === user.user_id && p.role === 'committee')
  })()

  const setInviteItemField = (index: number, key: keyof EventParticipantCreate, value: string) => {
    setInviteItems(prev => {
      const next = [...prev]
      // @ts-expect-error runtime assignment
      next[index][key] = value
      return next
    })
  }
  const addInviteRow = () => setInviteItems(prev => [...prev, { user_id: '', role: 'audience' }])
  const removeInviteRow = (index: number) => setInviteItems(prev => prev.filter((_, i) => i !== index))

  const submitBulkInvite = async () => {
    if (!eventId) return
    const cleaned = inviteItems
      .map(item => ({ user_id: item.user_id.trim(), role: item.role }))
      .filter(item => item.user_id.length > 0)
    if (cleaned.length === 0) {
      alert('Please add at least one user id to invite')
      return
    }
    const invalidRole = cleaned.some(i => i.role !== 'speaker' && i.role !== 'audience')
    if (invalidRole) {
      alert("Only 'speaker' or 'audience' roles are allowed for bulk invite")
      return
    }
    setInviting(true)
    try {
      await bulkInviteEventParticipants(eventId as string, { items: cleaned })
      alert('Invitations sent')
      router.push(`/events/${eventId}`)
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert((err as any)?.response?.data?.detail || 'Failed to send invitations')
    } finally {
      setInviting(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }
  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>
  }
  if (!event) {
    return <div className="p-6">Event not found</div>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Bulk invite to: {event.title}</h1>
      {!canInvite && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800">
          You don't have permission to invite participants to this event.
        </div>
      )}
      {canInvite && (
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Add user IDs and select role (speaker or audience)</h3>
          <div className="space-y-3">
            {inviteItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  className="border px-2 py-1 flex-1"
                  placeholder="User ID (UUID)"
                  value={item.user_id}
                  onChange={e => setInviteItemField(idx, 'user_id', e.target.value)}
                />
                <select
                  className="border px-2 py-1"
                  value={item.role}
                  onChange={e => setInviteItemField(idx, 'role', e.target.value)}
                >
                  <option value="audience">Audience</option>
                  <option value="speaker">Speaker</option>
                </select>
                <button type="button" className="text-red-600" onClick={() => removeInviteRow(idx)}>
                  Remove
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" className="border px-3 py-1" onClick={addInviteRow}>
                Add row
              </button>
              <button type="button" className="bg-blue-600 text-white px-3 py-1" disabled={inviting} onClick={submitBulkInvite}>
                {inviting ? 'Inviting...' : 'Send invitations'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}