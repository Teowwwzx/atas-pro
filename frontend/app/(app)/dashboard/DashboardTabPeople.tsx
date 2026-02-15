import React, { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { EventDetails, EventParticipantDetails, ProfileResponse } from '@/services/api.types'
import { getEventParticipants, getProfileByUserId, removeEventParticipant, verifyParticipantPayment, exportEventParticipants } from '@/services/api'
import { toast } from 'react-hot-toast'
import { Dialog, Transition } from '@headlessui/react'
import { StreamCommunicationLog } from '@/components/dashboard/StreamCommunicationLog'
import { EventPhase } from '@/lib/eventPhases'
import { WalkInModal } from '@/components/admin/modals/WalkInModal'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'

interface DashboardTabPeopleProps {
    event: EventDetails
    user: ProfileResponse | null
    phase: EventPhase
    onInvite?: () => void
}

export function DashboardTabPeople({ event, user, phase, onInvite }: DashboardTabPeopleProps) {
    const [participants, setParticipants] = useState<(EventParticipantDetails & { profile?: ProfileResponse })[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'speaker' | 'audience' | 'staff' | 'pending_payment'>('all')
    const [chatParticipant, setChatParticipant] = useState<(EventParticipantDetails & { profile?: ProfileResponse }) | null>(null)
    const [receiptParticipant, setReceiptParticipant] = useState<(EventParticipantDetails & { profile?: ProfileResponse }) | null>(null)
    const [showWalkInModal, setShowWalkInModal] = useState(false)

    // Modal state for verify
    const [verifyModalOpen, setVerifyModalOpen] = useState(false)
    const [verifyAction, setVerifyAction] = useState<{ id: string, status: 'accepted' | 'rejected' } | null>(null)

    // Modal state for remove
    const [removeModalOpen, setRemoveModalOpen] = useState(false)
    const [participantToRemove, setParticipantToRemove] = useState<string | null>(null)
    const [isRemoving, setIsRemoving] = useState(false)

    const fetchParticipants = async () => {
        try {
            const data = await getEventParticipants(event.id)
            // Enrich with profile data
            const enriched = await Promise.all(
                data.map(async (p) => {
                    if (!p.user_id) return p
                    try {
                        const profile = await getProfileByUserId(p.user_id)
                        return { ...p, profile }
                    } catch (e) {
                        return p
                    }
                })
            )
            setParticipants(enriched)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load participants')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchParticipants()
    }, [event.id])

    const confirmVerify = (id: string, status: 'accepted' | 'rejected') => {
        setVerifyAction({ id, status })
        setVerifyModalOpen(true)
    }

    const handleVerifyParams = async () => {
        if (!verifyAction) return
        const { id, status } = verifyAction

        try {
            await verifyParticipantPayment(event.id, id, status);
            toast.success(`Payment ${status}`)
            setParticipants(prev => prev.map(p => {
                if (p.id === id) {
                    return {
                        ...p,
                        status: status === 'accepted' ? 'accepted' : 'rejected',
                        payment_status: status === 'accepted' ? 'verified' : 'rejected'
                    }
                }
                return p
            }))
            if (receiptParticipant?.id === id) setReceiptParticipant(null);
        } catch (e) {
            toast.error('Failed to update status')
        } finally {
            setVerifyModalOpen(false)
            setVerifyAction(null)
        }
    }

    const handleRemove = (participantId: string) => {
        setParticipantToRemove(participantId)
        setRemoveModalOpen(true)
    }

    const confirmRemove = async () => {
        if (!participantToRemove) return

        setIsRemoving(true)
        try {
            await removeEventParticipant(event.id, participantToRemove)
            setParticipants(prev => prev.filter(p => p.id !== participantToRemove))
            toast.success('Removed successfully')
            setRemoveModalOpen(false)
            setParticipantToRemove(null)
        } catch (error) {
            console.error(error)
            toast.error('Failed to remove participant')
        } finally {
            setIsRemoving(false)
        }
    }

    const filtered = participants.filter(p => {
        if (filter === 'all') return true
        if (filter === 'speaker') return p.role === 'speaker'
        if (filter === 'audience') return p.role === 'audience' || p.role === 'student'
        if (filter === 'staff') return p.role === 'organizer' || p.role === 'committee'
        if (filter === 'pending_payment') return p.payment_proof_url && (p.status === 'pending' || p.payment_status === 'pending')
        return true
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted': return 'bg-green-100 text-green-700'
            case 'pending': return 'bg-yellow-100 text-yellow-700'
            case 'rejected': return 'bg-red-100 text-red-700'
            default: return 'bg-zinc-100 text-zinc-500'
        }
    }

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div />
                {onInvite && (
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                try {
                                    toast.loading('Exporting...', { id: 'export' })
                                    const blob = await exportEventParticipants(event.id)
                                    const url = window.URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = `participants_${event.title.replace(' ', '_')}.csv`
                                    document.body.appendChild(a)
                                    a.click()
                                    window.URL.revokeObjectURL(url)
                                    toast.success('Exported successfully', { id: 'export' })
                                } catch (e) {
                                    console.error(e)
                                    toast.error('Failed to export', { id: 'export' })
                                }
                            }}
                            className="px-5 py-2.5 bg-white text-zinc-900 border border-zinc-200 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all shadow-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export CSV
                        </button>
                        {event.type === 'physical' && (
                            <button
                                onClick={() => setShowWalkInModal(true)}
                                className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all shadow-sm flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Walk-in Attendance
                            </button>
                        )}
                        <button
                            onClick={onInvite}
                            className="px-5 py-2.5 bg-zinc-900 text-yellow-400 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                            Invite People
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-2 border-b border-zinc-100 pb-1 overflow-x-auto">
                {[
                    { key: 'all', label: 'All' },
                    { key: 'speaker', label: 'Speakers' },
                    { key: 'staff', label: 'Committee' },
                    { key: 'audience', label: 'Attendees' },
                    { key: 'pending_payment', label: 'Pending Payment', count: participants.filter(p => p.payment_proof_url && (p.status === 'pending' || p.payment_status === 'pending')).length },
                ].map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key as any)}
                        className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-2 ${filter === f.key
                            ? 'bg-zinc-900 text-white shadow-md'
                            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                            }`}
                    >
                        {f.label}
                        {f.count ? <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{f.count}</span> : null}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-zinc-50 rounded-[2rem] p-12 text-center border border-zinc-100">
                    <p className="text-zinc-400 font-medium">No one found in this category.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-50 border-b border-zinc-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {filtered.map((item) => (
                                <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {item.user_id ? (
                                            <Link href={`/profile/${item.user_id}`} className="flex items-center gap-4 hover:opacity-75 transition-opacity group/link">
                                                {item.profile?.avatar_url ? (
                                                    <img
                                                        src={item.profile.avatar_url}
                                                        alt={item.profile.full_name}
                                                        className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-50 group-hover/link:ring-yellow-400 transition-all"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold group-hover/link:bg-yellow-100 group-hover/link:text-yellow-600 transition-colors">
                                                        {item.profile?.full_name?.charAt(0) || item.name?.charAt(0) || '?'}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-zinc-900 group-hover/link:text-yellow-600 transition-colors">{item.profile?.full_name || item.name || 'Unknown User'}</div>
                                                    <div className="text-xs text-zinc-500">{item.profile?.email || item.email || 'No email'}</div>
                                                    {/* Payment Status Label */}
                                                    {item.payment_proof_url && (
                                                        <div className="mt-1">
                                                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold uppercase transition-colors hover:bg-blue-100 cursor-help" title={item.payment_status || 'Submitted'}>
                                                                Receipt Submitted
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        ) : (
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold">
                                                    {item.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-zinc-900">{item.name || 'Unknown User'}</div>
                                                    <div className="text-xs text-zinc-500">{item.email || 'No email'}</div>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-zinc-700 capitalize block px-2 py-1 rounded-md bg-zinc-100 w-fit">
                                            {item.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Review Payment Button */}
                                            {item.payment_proof_url && (item.status === 'pending' || item.payment_status === 'pending') && (
                                                <button
                                                    onClick={() => setReceiptParticipant(item)}
                                                    className="text-blue-600 hover:text-blue-700 font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                                                >
                                                    Verify Payment
                                                </button>
                                            )}

                                            {/* Chat Button */}
                                            {item.conversation_id && (
                                                <button
                                                    onClick={() => setChatParticipant(item)}
                                                    className="text-zinc-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
                                                    title="Chat with participant"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                    </svg>
                                                </button>
                                            )}

                                            {/* Delete Button - Hide during event execution */}
                                            {phase !== EventPhase.EVENT_DAY && phase !== EventPhase.ONGOING && phase !== EventPhase.POST_EVENT && (
                                                <button
                                                    onClick={() => handleRemove(item.id)}
                                                    className="text-zinc-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                                                    title="Remove participant"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Receipt Review Modal */}
            <Transition appear show={!!receiptParticipant} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setReceiptParticipant(null)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <Dialog.Title as="h3" className="text-xl font-bold text-zinc-900">
                                            Manage Payment
                                        </Dialog.Title>
                                        <button onClick={() => setReceiptParticipant(null)} className="text-zinc-400 hover:text-zinc-600">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>

                                    <div className="mb-6 bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200 max-h-[60vh] flex items-center justify-center">
                                        {receiptParticipant?.payment_proof_url ? (
                                            <img src={receiptParticipant.payment_proof_url} alt="Receipt" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <div className="p-12 text-zinc-400">No image available</div>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => confirmVerify(receiptParticipant?.id!, 'rejected')}
                                            className="flex-1 py-3 text-red-600 font-bold bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                                        >
                                            Reject Payment
                                        </button>
                                        <button
                                            onClick={() => confirmVerify(receiptParticipant?.id!, 'accepted')}
                                            className="flex-1 py-3 text-green-600 font-bold bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
                                        >
                                            Verify Payment
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <ConfirmationModal
                isOpen={removeModalOpen}
                onClose={() => setRemoveModalOpen(false)}
                onConfirm={confirmRemove}
                title="Remove Participant"
                message="Are you sure you want to remove this participant from the event? This action cannot be undone."
                confirmText="Remove"
                variant="danger"
                isLoading={isRemoving}
            />

            {/* Chat Modal */}
            <Transition appear show={!!chatParticipant} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setChatParticipant(null)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-[2rem] bg-white shadow-xl transition-all border border-zinc-100 flex flex-col h-[70vh]">
                                <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                            {chatParticipant?.profile?.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-zinc-900">{chatParticipant?.profile?.full_name || 'Participant'}</h3>
                                            <p className="text-zinc-500 text-xs">Chatting regarding {event.title}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setChatParticipant(null)} className="text-zinc-400 hover:text-zinc-600 p-2 hover:bg-zinc-100 rounded-full transition-colors">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-hidden flex flex-col p-6">
                                    {chatParticipant?.conversation_id ? (
                                        <StreamCommunicationLog
                                            conversationId={chatParticipant.conversation_id}
                                            organizerName={chatParticipant.profile?.full_name || 'Participant'}
                                            currentUserId={user?.user_id}
                                        />
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center text-zinc-400">
                                            Chat unavailable
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <WalkInModal
                isOpen={showWalkInModal}
                onClose={() => setShowWalkInModal(false)}
                event={event}
                onSuccess={fetchParticipants}
            />

            <ConfirmationModal
                isOpen={verifyModalOpen}
                onClose={() => setVerifyModalOpen(false)}
                onConfirm={handleVerifyParams}
                title="Confirm Payment Status"
                message={`Are you sure you want to mark this payment as ${verifyAction?.status}?`}
                confirmText={verifyAction?.status === 'accepted' ? 'Approve' : 'Reject'}
                variant={verifyAction?.status === 'accepted' ? 'primary' : 'danger'}
            />
        </div>
    )
}
