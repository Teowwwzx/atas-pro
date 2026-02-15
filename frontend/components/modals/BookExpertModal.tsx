
import React, { useEffect, useState } from 'react'
import { getMyEvents, inviteEventParticipant, createConversation } from '@/services/api'
import { MyEventItem, EventParticipantRole } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { Dialog } from '@headlessui/react'
import { useRouter } from 'next/navigation'

interface BookExpertModalProps {
    isOpen: boolean
    onClose: () => void
    expertId: string
    expertName: string
}

export function BookExpertModal({ isOpen, onClose, expertId, expertName }: BookExpertModalProps) {
    const [events, setEvents] = useState<MyEventItem[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedEventId, setSelectedEventId] = useState<string>('')
    const [message, setMessage] = useState('')
    const router = useRouter()

    useEffect(() => {
        if (isOpen) {
            loadEvents()
        }
    }, [isOpen])

    const loadEvents = async () => {
        setLoading(true)
        try {
            const all = await getMyEvents()
            // Filter: Organized by me, upcoming, active
            const valid = all.filter(e =>
                e.my_role === 'organizer' &&
                new Date(e.start_datetime) > new Date() &&
                e.status !== 'ended'
            )
            setEvents(valid)
            if (valid.length > 0) setSelectedEventId(valid[0].event_id)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load events')
        } finally {
            setLoading(false)
        }
    }

    const handleBook = async () => {
        if (!selectedEventId) return
        setLoading(true)
        try {
            // 1. Send Invitation
            await inviteEventParticipant(selectedEventId, {
                user_id: expertId,
                role: 'speaker', // Assuming booking meant as speaker/guest
                description: message || 'Invited via Book Expert'
            })

            // 2. Start Conversation (optional but good UX)
            // Create conversation and maybe send a default message?
            // For now just invite.

            toast.success(`Invitation sent to ${expertName}`)
            onClose()
        } catch (error) {
            console.error(error)
            toast.error('Failed to send invitation')
        } finally {
            setLoading(false)
        }
    }

    // Quick Message (Start Chat)
    const handleMessage = async () => {
        try {
            const conv = await createConversation([expertId])
            onClose()
            router.push(`/messages?conversation_id=${conv.id}`)
        } catch (error) {
            console.error(error)
            toast.error('Failed to start chat')
        }
    }

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                    <Dialog.Title className="text-lg font-bold text-zinc-900 mb-4">
                        Invite {expertName}
                    </Dialog.Title>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Select Event</label>
                            {loading && events.length === 0 ? (
                                <div className="text-sm text-zinc-400">Loading events...</div>
                            ) : events.length === 0 ? (
                                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                                    You don't have any upcoming events to invite this expert to.
                                </div>
                            ) : (
                                <select
                                    value={selectedEventId}
                                    onChange={e => setSelectedEventId(e.target.value)}
                                    className="w-full rounded-xl border-zinc-200 text-sm focus:ring-amber-500 font-medium"
                                >
                                    {events.map(e => (
                                        <option key={e.event_id} value={e.event_id}>{e.title}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Message (Optional)</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                className="w-full rounded-xl border-zinc-200 text-sm focus:ring-amber-500 h-24 resize-none"
                                placeholder="Hi, I'd like to invite you to speak at..."
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleMessage}
                                className="flex-1 py-2.5 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50"
                            >
                                Message Only
                            </button>
                            <button
                                onClick={handleBook}
                                disabled={loading || events.length === 0}
                                className="flex-1 py-2.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Sending...' : 'Send Invitation'}
                            </button>
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    )
}
