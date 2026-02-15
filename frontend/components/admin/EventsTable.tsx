'use client'

import React, { useMemo, useState } from 'react'
import { EventDetails, EventParticipantDetails } from '@/services/api.types'
import { adminService } from '@/services/admin.service'
import { getProfileByUserId, getEventParticipants, verifyParticipantPayment, getMe } from '@/services/api'
import useSWR from 'swr'
import { toast } from 'react-hot-toast'
import { toastError } from '@/lib/utils'
import {
    TrashIcon,
    CheckIcon,
    Cross2Icon,
    ChevronDownIcon,
    ChevronUpIcon,
    ImageIcon,
    Pencil1Icon
} from '@radix-ui/react-icons'
import { format, differenceInDays } from 'date-fns'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'

interface EventsTableProps {
    events: EventDetails[]
    onRefresh: () => void
}

import { CreateEventModal } from './modals/CreateEventModal'
import { EditEventModal } from './modals/EditEventModal'

function ParticipantList({ eventId, event, onRefresh }: { eventId: string, event: EventDetails, onRefresh: () => void }) {
    const { data: participants, error, mutate, isLoading } = useSWR<EventParticipantDetails[]>(
        eventId ? `/events/${eventId}/participants` : null,
        () => getEventParticipants(eventId),
        { revalidateOnFocus: true }
    )

    const handleVerify = async (participantId: string, status: 'accepted' | 'rejected') => {
        try {
            await verifyParticipantPayment(eventId, participantId, status)
            toast.success(`Payment ${status}`)
            mutate()
            onRefresh() // Refresh parent metrics
        } catch (error) {
            toastError(error)
        }
    }

    const [activeRoleFilter, setActiveRoleFilter] = useState<string>('all')
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    const filteredParticipants = useMemo(() => {
        if (!participants) return []
        if (activeRoleFilter === 'all') return participants
        return participants.filter(p => p.role.toLowerCase() === activeRoleFilter)
    }, [participants, activeRoleFilter])

    const roleCounts = useMemo(() => {
        if (!participants) return { all: 0 }
        const counts: Record<string, number> = { all: participants.length }
        participants.forEach(p => {
            const role = p.role.toLowerCase()
            counts[role] = (counts[role] || 0) + 1
        })
        return counts
    }, [participants])

    if (isLoading) return <div className="py-4 text-center text-gray-500 text-xs">Loading participants...</div>
    if (error) return <div className="py-4 text-center text-red-500 text-xs font-medium">Failed to load participants</div>
    if (!participants || participants.length === 0) return <div className="py-6 text-center text-gray-500 italic text-sm bg-gray-50/50 rounded-xl border border-dashed">No participants registered yet</div>

    return (
        <div className="mt-6 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-900">Participants & Payments</h4>

                <div className="flex items-center gap-3">
                    {/* Event Type Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${event.registration_type === 'paid'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                        {event.registration_type === 'paid' ? '💰 Paid' : '🆓 Free'}
                    </span>

                    {/* Capacity Display */}
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-mono font-bold">
                        {participants.length}/{event.max_participant || '∞'}
                    </span>
                </div>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex gap-2 mb-4 border-b border-gray-200">
                {(['all', 'student', 'committee', 'speaker', 'sponsor'] as const).map(role => (
                    <button
                        key={role}
                        onClick={() => setActiveRoleFilter(role)}
                        className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${activeRoleFilter === role
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="capitalize">{role}</span>
                        <span className="ml-2 text-xs opacity-75">({roleCounts[role] || 0})</span>
                    </button>
                ))}
            </div>
            <div className="max-h-[400px] overflow-y-auto border border-gray-100 rounded-xl shadow-sm">
                <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-gray-700">Name / Email</th>
                            <th className="px-4 py-3 font-semibold text-gray-700">Role</th>
                            <th className="px-4 py-3 font-semibold text-gray-700">Payment Status</th>
                            <th className="px-4 py-3 font-semibold text-gray-700">Proof</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredParticipants.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="font-semibold text-gray-900">{p.name || 'Anonymous'}</div>
                                    <div className="text-gray-500">{p.email}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="capitalize px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
                                        {p.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${p.payment_status === 'accepted' ? 'bg-green-100 text-green-700' :
                                        p.payment_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                            p.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-blue-50 text-blue-700'
                                        }`}>
                                        {p.payment_status === 'accepted' && '✅ Verified'}
                                        {p.payment_status === 'rejected' && '❌ Rejected'}
                                        {p.payment_status === 'pending' && '⏳ Pending'}
                                        {!p.payment_status && '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {p.payment_proof_url ? (
                                        <button
                                            onClick={() => setPreviewImage(p.payment_proof_url || null)}
                                            className="relative group"
                                        >
                                            <img
                                                src={p.payment_proof_url}
                                                alt="Payment proof"
                                                className="w-12 h-12 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-400 transition-all cursor-pointer"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-all" />
                                        </button>
                                    ) : (
                                        <span className="text-gray-400 text-xs">N/A</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {p.payment_status === 'pending' && (
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => handleVerify(p.id, 'accepted')}
                                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                                                title="Accept Payment"
                                            >
                                                <CheckIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleVerify(p.id, 'rejected')}
                                                className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                                                title="Reject Payment"
                                            >
                                                <Cross2Icon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <Dialog.Root open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
                        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-4xl max-h-[90vh] outline-none">
                            <Dialog.Title className="sr-only">Payment Proof Preview</Dialog.Title>
                            <Dialog.Description className="sr-only">A large preview of the uploaded payment proof image.</Dialog.Description>
                            <div className="relative">
                                <Dialog.Close className="absolute -top-10 right-0 text-white hover:text-gray-300">
                                    <Cross2Icon className="w-6 h-6" />
                                </Dialog.Close>
                                <img src={previewImage} alt="Payment proof preview" className="max-w-full max-h-[85vh] rounded-lg" />
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            )}
        </div>
    )
}

export function EventsTable({ events, onRefresh }: EventsTableProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState<EventDetails | null>(null)
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [deleteEventId, setDeleteEventId] = useState<string | null>(null)
    const [moderationTargetId, setModerationTargetId] = useState<string | null>(null)
    const [moderationType, setModerationType] = useState<'unpublish' | 'delete' | 'publish' | null>(null)
    const [moderationReason, setModerationReason] = useState<string>('')
    const { data: me } = useSWR('/users/me', () => getMe(), { revalidateOnFocus: false, dedupingInterval: 60000 })
    const roles = useMemo(() => (me?.roles || []), [me])
    const isSuperAdmin = useMemo(() => roles.includes('super_admin'), [roles])

    const notifyOrganizer = async (event: EventDetails, action: 'unpublish' | 'delete', reason?: string) => {
        const title = action === 'unpublish' ? 'Event Unpublished' : 'Event Removed'
        const base = action === 'unpublish'
            ? `Your event "${event.title}" has been unpublished by an administrator for review. Please update content or contact support.`
            : `Your event "${event.title}" has been removed by a super administrator due to policy violations. If you believe this is a mistake, contact support.`
        const content = reason ? `${base}\n\nReason: ${reason}` : base
        try {
            const res = await adminService.broadcastEmailTemplate({
                template_id: 'moderation_notice',
                variables: { event_title: event.title, reason: reason || '' },
                target_user_id: event.organizer_id,
            })
            if (!res || typeof res.count !== 'number' || res.count === 0) {
                await adminService.broadcastNotification({ title, content, target_user_id: event.organizer_id })
            }
        } catch {
            // no-op
        }
    }

    const handleDelete = async (eventId: string, reason?: string) => {
        setIsLoading(eventId)
        try {
            const ev = events.find(e => e.id === eventId)
            if (!ev) throw new Error('Event not found')
            if (ev.status === 'published') {
                toast.error('Unpublish the event before deleting')
                return
            }
            await adminService.deleteEvent(eventId)
            toast.success('Event deleted')
            await notifyOrganizer(ev, 'delete', reason)
            onRefresh()
        } catch (error) {
            toastError(error, undefined, 'Failed to delete event')
        } finally {
            setIsLoading(null)
        }
    }

    const handlePublish = async (eventId: string) => {
        setIsLoading(eventId)
        try {
            await adminService.publishEvent(eventId)
            toast.success('Event published')
            onRefresh()
        } catch (error) {
            toastError(error, undefined, 'Failed to publish event')
        } finally {
            setIsLoading(null)
        }
    }

    const handleUnpublish = async (eventId: string, reason?: string) => {
        setIsLoading(eventId)
        try {
            await adminService.unpublishEvent(eventId)
            toast.success('Event unpublished')
            const ev = events.find(e => e.id === eventId)
            if (ev) await notifyOrganizer(ev, 'unpublish', reason)
            onRefresh()
        } catch (error) {
            toastError(error, undefined, 'Failed to unpublish event')
        } finally {
            setIsLoading(null)
        }
    }

    const toggleExpand = (eventId: string) => {
        setExpandedEventId(expandedEventId === eventId ? null : eventId)
    }

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700 w-10"></th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Event</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Organizer</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Date</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {events.map((event) => (
                                <React.Fragment key={event.id}>
                                    <tr
                                        onClick={() => toggleExpand(event.id)}
                                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedEventId === event.id ? 'bg-gray-50' : ''}`}
                                    >
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleExpand(event.id); }}
                                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                            >
                                                {expandedEventId === event.id ? (
                                                    <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                                                ) : (
                                                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {event.cover_url ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setPreviewImage(event.cover_url || null); }}
                                                        className="relative group"
                                                    >
                                                        <Image
                                                            src={event.cover_url}
                                                            alt=""
                                                            width={40}
                                                            height={40}
                                                            unoptimized
                                                            className="w-10 h-10 rounded-lg object-cover bg-gray-100 group-hover:opacity-80 transition-opacity"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ImageIcon className="w-4 h-4 text-white drop-shadow-md" />
                                                        </div>
                                                    </button>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                        <ImageIcon className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-gray-900">{event.title}</div>
                                                    <div className="text-xs text-gray-500">{event.type} • {event.format}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <OrganizerName userId={event.organizer_id} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-0.5">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {format(new Date(event.start_datetime), 'MMM d, yyyy')}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    to {format(new Date(event.end_datetime), 'MMM d, yyyy')}
                                                </div>
                                                <div className="text-xs text-blue-600 font-medium">
                                                    {(() => {
                                                        const days = differenceInDays(
                                                            new Date(event.end_datetime),
                                                            new Date(event.start_datetime)
                                                        )
                                                        return days === 0 ? 'Same day' : `${days} day${days > 1 ? 's' : ''}`
                                                    })()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {/* Publication Status */}
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${event.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {event.status === 'published' ? '✓ Published' : '○ Draft'}
                                                </span>

                                                {/* Registration Status */}
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${event.registration_status === 'opened' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {event.registration_status === 'opened' ? '● Open' : '● Closed'}
                                                </span>

                                                {/* Visibility Status */}
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${event.visibility === 'public' ? 'bg-blue-100 text-blue-700' :
                                                    event.visibility === 'private' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {event.visibility}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => setEditingEvent(event)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Event"
                                                >
                                                    <Pencil1Icon className="w-4 h-4" />
                                                </button>

                                                {event.status === 'draft' ? (
                                                    <button
                                                        onClick={() => { setModerationTargetId(event.id); setModerationType('publish'); }}
                                                        disabled={isLoading === event.id}
                                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Publish"
                                                    >
                                                        <CheckIcon className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => { setModerationTargetId(event.id); setModerationType('unpublish'); setModerationReason(''); }}
                                                        disabled={isLoading === event.id}
                                                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                        title="Unpublish"
                                                    >
                                                        <Cross2Icon className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {isSuperAdmin ? (
                                                    event.status === 'published' ? (
                                                        <button
                                                            disabled
                                                            className="p-2 text-gray-300 rounded-lg cursor-not-allowed"
                                                            title="Unpublish first to delete"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setModerationTargetId(event.id); setModerationType('delete'); setModerationReason('') }}
                                                            disabled={isLoading === event.id}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    )
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedEventId === event.id && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="grid grid-cols-2 gap-6 text-sm">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                                                        <p className="text-gray-600 whitespace-pre-wrap">{event.description || 'No description provided.'}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 mb-2">Venue Remark</h4>
                                                        <p className="text-gray-600">
                                                            {event.venue_remark || 'TBD'}
                                                        </p>
                                                        {event.venue_place_id && (
                                                            <p className="text-xs text-gray-400 mt-1">Venue Place ID: {event.venue_place_id}</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 mb-2">Settings</h4>
                                                        <div className="space-y-1 text-sm text-gray-600">
                                                            <div className="flex items-center gap-2">
                                                                <span>Auto Accept:</span>
                                                                <span className={event.auto_accept_registration ? "text-green-600 font-medium" : "text-gray-500"}>
                                                                    {event.auto_accept_registration ? "Enabled" : "Disabled"}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span>Attendance:</span>
                                                                <span className={event.is_attendance_enabled ? "text-green-600 font-medium" : "text-gray-500"}>
                                                                    {event.is_attendance_enabled ? "Enabled" : "Disabled"}
                                                                </span>
                                                            </div>
                                                            {event.deleted_at && (
                                                                <div className="flex items-center gap-2 text-red-600 font-medium">
                                                                    <span>Deleted At:</span>
                                                                    <span>{format(new Date(event.deleted_at), 'MMM d, yyyy HH:mm')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {event.registration_type === 'paid' && event.payment_qr_url && (
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 mb-2">Payment QR</h4>
                                                            <button
                                                                onClick={() => setPreviewImage(event.payment_qr_url || null)}
                                                                className="relative group"
                                                            >
                                                                <img
                                                                    src={event.payment_qr_url}
                                                                    alt="Payment QR"
                                                                    className="w-32 h-32 rounded-lg border border-gray-200 object-contain bg-white group-hover:opacity-80 transition-opacity"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <ImageIcon className="w-6 h-6 text-white drop-shadow-md" />
                                                                </div>
                                                            </button>
                                                            <p className="text-xs text-gray-500 mt-1">Click to enlarge</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <ParticipantList eventId={event.id} event={event} onRefresh={onRefresh} />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {events.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No events found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingEvent && (
                <EditEventModal
                    isOpen={!!editingEvent}
                    onClose={() => setEditingEvent(null)}
                    event={editingEvent}
                    onSuccess={() => {
                        setEditingEvent(null)
                        onRefresh()
                    }}
                />
            )}

            <Dialog.Root open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-xl shadow-2xl z-50 max-w-3xl max-h-[90vh] w-full outline-none">
                        <Dialog.Title className="sr-only">Event Cover Preview</Dialog.Title>
                        <Dialog.Description className="sr-only">
                            Full size preview of the event cover image
                        </Dialog.Description>
                        {previewImage && (
                            <Image
                                src={previewImage}
                                alt="Event Cover"
                                width={1200}
                                height={800}
                                unoptimized
                                className="w-full h-full object-contain rounded-lg"
                            />
                        )}
                        <Dialog.Close className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-white transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-900" />
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Delete reason modal */}
            <Dialog.Root open={!!moderationTargetId && moderationType === 'delete'} onOpenChange={() => { setModerationTargetId(null); setModerationType(null); setModerationReason('') }}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 w-full max-w-lg outline-none">
                        <Dialog.Title className="text-lg font-bold text-gray-900 mb-2">Delete Event (Super Admin)</Dialog.Title>
                        <p className="text-sm text-gray-700 mb-4">Only unpublished events can be deleted. The organizer will be notified. Please provide a reason.</p>
                        <textarea value={moderationReason} onChange={(e) => setModerationReason(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg h-28 text-sm" placeholder="Reason (required)" />
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button className="px-3 py-2 border border-gray-300 rounded-lg" onClick={() => { setModerationTargetId(null); setModerationType(null); setModerationReason('') }}>Cancel</button>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700" disabled={!moderationReason.trim()} onClick={() => { if (moderationTargetId) handleDelete(moderationTargetId, moderationReason.trim()); setModerationTargetId(null); setModerationType(null); setModerationReason('') }}>Delete</button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <Dialog.Root open={!!moderationTargetId && moderationType === 'unpublish'} onOpenChange={() => { setModerationTargetId(null); setModerationType(null); setModerationReason('') }}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 w-full max-w-lg outline-none">
                        <Dialog.Title className="text-lg font-bold text-gray-900 mb-2">Unpublish Event</Dialog.Title>
                        <p className="text-sm text-gray-700 mb-4">Provide a reason for unpublishing. The organizer will be notified.</p>
                        <textarea value={moderationReason} onChange={(e) => setModerationReason(e.target.value)} className="text-gray-600 w-full px-3 py-2 border border-gray-300 rounded-lg h-28 text-sm" placeholder="Reason (required)" />
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600" onClick={() => { setModerationTargetId(null); setModerationType(null); setModerationReason('') }}>Cancel</button>
                            <button className="px-4 py-2 bg-yellow-400 text-zinc-900 rounded-lg font-bold hover:bg-yellow-300" disabled={!moderationReason.trim()} onClick={() => { if (moderationTargetId) handleUnpublish(moderationTargetId, moderationReason.trim()); setModerationTargetId(null); setModerationType(null); setModerationReason('') }}>Unpublish</button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Publish modal */}
            <Dialog.Root open={!!moderationTargetId && moderationType === 'publish'} onOpenChange={() => { setModerationTargetId(null); setModerationType(null); }}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 w-full max-w-sm outline-none">
                        <Dialog.Title className="text-lg font-bold text-gray-900 mb-2">Publish Event?</Dialog.Title>
                        <p className="text-sm text-gray-600 mb-6">This event will become visible to users based on its visibility settings.</p>
                        <div className="flex items-center justify-end gap-2">
                            <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium" onClick={() => { setModerationTargetId(null); setModerationType(null); }}>Cancel</button>
                            <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 text-sm" onClick={() => { if (moderationTargetId) handlePublish(moderationTargetId); setModerationTargetId(null); setModerationType(null); }}>Confirm Publish</button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    )
}

function OrganizerName({ userId }: { userId: string }) {
    const { data } = useSWR(['/profiles', userId], () => getProfileByUserId(userId), {
        revalidateOnFocus: false,
        dedupingInterval: 300000,
    })
    if (!data) {
        return (
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {userId.slice(0, 8)}...
            </span>
        )
    }
    return <span className="text-gray-700 font-medium">{data.full_name || userId.slice(0, 8) + '...'}</span>
}

// Helper component to avoid React fragment key warning with map
const 片 = ({ children }: { children: React.ReactNode }) => <>{children}</>
