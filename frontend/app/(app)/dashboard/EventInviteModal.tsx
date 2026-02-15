import React, { useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { findProfiles, inviteEventParticipant, getEventParticipants } from '@/services/api'
import { ProfileResponse, EventProposalResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'
// @ts-ignore
import { debounce } from 'lodash'
import { ProposalManagerModal } from './ProposalManagerModal'

interface EventInviteModalProps {
    isOpen: boolean
    onClose: () => void
    eventId: string
    eventTitle: string
    onSuccess?: () => void
}

export function EventInviteModal({ isOpen, onClose, eventId, eventTitle, onSuccess }: EventInviteModalProps) {
    const [inviteRole, setInviteRole] = useState<'speaker' | 'audience' | 'committee'>('speaker')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<ProfileResponse[]>([])
    const [selectedUsers, setSelectedUsers] = useState<string[]>([])
    const [selectedProposalId, setSelectedProposalId] = useState<string>('')
    const [selectedProposal, setSelectedProposal] = useState<EventProposalResponse | null>(null)
    const [joinedUserIds, setJoinedUserIds] = useState<Set<string>>(new Set())
    const [estAudience, setEstAudience] = useState<string>('')
    const [isProposalManagerOpen, setIsProposalManagerOpen] = useState(false)

    const getRoleFilter = () => {
        if (inviteRole === 'speaker') return 'expert'
        if (inviteRole === 'audience') return 'student'
        return undefined // Committee = search all
    }

    const fetchDefaultUsers = async () => {
        setLoading(true)
        try {
            const data = await findProfiles({ role: getRoleFilter() })
            setResults(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const doSearch = async (query: string) => {
        setLoading(true)
        try {
            const isEmail = query.includes('@')
            const commonParams = { role: getRoleFilter() }
            const searchParams = isEmail ? { email: query, ...commonParams } : { name: query, ...commonParams }

            const data = await findProfiles(searchParams)
            setResults(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // Load defaults on open or role change
    useEffect(() => {
        if (isOpen) {
            // Fetch existing participants to exclude
            getEventParticipants(eventId).then(participants => {
                // @ts-ignore
                const ids = new Set(participants.map(p => p.user_id).filter((id): id is string => !!id))
                setJoinedUserIds(ids)
            }).catch(console.error)

            if (search) {
                doSearch(search)
            } else {
                fetchDefaultUsers()
            }
        }
    }, [isOpen, inviteRole, eventId])

    const debouncedSearch = React.useCallback(debounce((q: string) => doSearch(q), 500), [inviteRole])

    useEffect(() => {
        if (search) {
            debouncedSearch(search)
        } else if (isOpen) {
            fetchDefaultUsers()
        }
    }, [search, debouncedSearch, isOpen])

    const toggleUser = (userId: string) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId))
        } else {
            setSelectedUsers([...selectedUsers, userId])
        }
    }

    const handleSend = async () => {
        if (selectedUsers.length === 0) return

        setLoading(true)
        try {
            const promises = selectedUsers.map(userId =>
                inviteEventParticipant(eventId, {
                    user_id: userId,
                    role: inviteRole as any,
                    description: undefined,
                    proposal_id: selectedProposalId || undefined
                })
            )

            await Promise.all(promises)

            let action = 'Invited'
            if (inviteRole === 'speaker') {
                action = selectedProposalId ? 'Proposals sent' : 'Invited as Speaker'
            } else if (inviteRole === 'committee') {
                action = 'Invited as Committee'
            } else {
                action = 'Invited as Participant'
            }

            toast.success(`${action} to ${selectedUsers.length} users!`)
            if (onSuccess) onSuccess()
            onClose()
            setSelectedUsers([])
            setSelectedProposalId('')
            setSelectedProposal(null)
            setSearch('')
        } catch (error) {
            console.error(error)
            toast.error('Failed to send invitations')
        } finally {
            setLoading(false)
        }
    }

    const visibleResults = results.filter(user => !joinedUserIds.has(user.user_id))

    return (
        <Fragment>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-[2rem] bg-white p-8 text-left align-middle shadow-2xl transition-all border border-zinc-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <Dialog.Title as="h3" className="text-3xl font-black text-zinc-900 tracking-tight">
                                            Invite People
                                        </Dialog.Title>
                                        <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <p className="text-zinc-500 font-medium mb-6">
                                        Invite speakers, guests, or students to <span className="text-zinc-900 font-bold">{eventTitle}</span>
                                    </p>

                                    <div className="space-y-6">
                                        {/* Role Selection */}
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Invite As:</span>
                                            <div className="flex bg-zinc-100 rounded-lg p-1">
                                                <button
                                                    onClick={() => setInviteRole('speaker')}
                                                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${inviteRole === 'speaker' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                                                >
                                                    Speaker
                                                </button>
                                                <button
                                                    onClick={() => setInviteRole('committee')}
                                                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${inviteRole === 'committee' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                                                >
                                                    Committee
                                                </button>
                                                <button
                                                    onClick={() => setInviteRole('audience')}
                                                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${inviteRole === 'audience' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                                                >
                                                    Participant
                                                </button>
                                            </div>
                                        </div>

                                        {/* Proposal Selector (Conditional) */}
                                        {inviteRole === 'speaker' && (
                                            <div className="space-y-4 animate-fadeIn">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Est. Audience (Optional)</label>
                                                    <input
                                                        type="number"
                                                        value={estAudience}
                                                        onChange={(e) => setEstAudience(e.target.value)}
                                                        placeholder="e.g. 50"
                                                        className="block w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white transition-all font-medium"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Attach Proposal (Optional)</label>

                                                    {selectedProposalId ? (
                                                        <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl group hover:border-yellow-400 transition-all">
                                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-red-500 shadow-sm">
                                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Attached</p>
                                                                <p className="text-sm font-bold text-zinc-900 truncate">{selectedProposal?.title || 'Untitled Proposal'}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSelectedProposalId('')}
                                                                className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors"
                                                                title="Remove Proposal"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setIsProposalManagerOpen(true)}
                                                            className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 font-bold hover:border-yellow-400 hover:text-yellow-600 hover:bg-yellow-50/50 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                            Select or Upload Proposal
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Search */}
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="block w-full pl-12 pr-4 py-4 bg-zinc-50 border-transparent rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white transition-all duration-200 font-medium text-lg"
                                                placeholder={inviteRole === 'speaker' ? "Search experts..." : inviteRole === 'committee' ? "Search anyone..." : "Search students..."}
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* User List */}
                                        <div className="h-[300px] overflow-y-auto border border-zinc-100 rounded-2xl bg-white p-2 space-y-2 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
                                            {loading ? (
                                                <div className="flex items-center justify-center h-full">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                                                </div>
                                            ) : visibleResults.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2">
                                                    <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    <p className="font-medium">No users found</p>
                                                </div>
                                            ) : (
                                                visibleResults.map(user => (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => toggleUser(user.user_id)}
                                                        className={`flex items-center p-3 rounded-xl cursor-pointer transition-all border group ${selectedUsers.includes(user.user_id)
                                                            ? 'bg-yellow-50 border-yellow-400/50 shadow-sm'
                                                            : 'bg-white border-transparent hover:bg-zinc-50'
                                                            }`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 transition-colors ${selectedUsers.includes(user.user_id)
                                                            ? 'bg-yellow-400 border-yellow-400 text-white'
                                                            : 'bg-zinc-100 border-zinc-100 text-zinc-400 group-hover:border-zinc-200'
                                                            }`}>
                                                            {selectedUsers.includes(user.user_id) ? (
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            ) : (
                                                                user.avatar_url ? (
                                                                    <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                                                ) : (
                                                                    <span className="text-sm font-bold">{user.full_name?.charAt(0)}</span>
                                                                )
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className={`text-sm font-bold truncate ${selectedUsers.includes(user.user_id) ? 'text-zinc-900' : 'text-zinc-700'}`}>
                                                                {user.full_name}
                                                            </h4>
                                                            <p className="text-xs text-zinc-500 truncate">
                                                                {user.bio || 'No bio'} • {user.email || 'No email'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-zinc-100">
                                        <button
                                            type="button"
                                            className="px-6 py-3 rounded-xl text-zinc-500 font-bold hover:bg-zinc-100 transition-colors"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={selectedUsers.length === 0}
                                            onClick={handleSend}
                                            className="px-8 py-3 rounded-xl bg-zinc-900 text-white font-bold shadow-lg hover:bg-zinc-800 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                                        >
                                            <span>Send {selectedProposalId ? 'Proposals' : 'Invitations'}</span>
                                            {selectedUsers.length > 0 && (
                                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                                    {selectedUsers.length}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Proposal Manager Modal */}
            <ProposalManagerModal
                isOpen={isProposalManagerOpen}
                onClose={() => setIsProposalManagerOpen(false)}
                eventId={eventId}
                onSelectProposal={(proposal) => {
                    setSelectedProposalId(proposal.id)
                    setSelectedProposal(proposal)
                }}
                selectedProposalId={selectedProposalId}
            />
        </Fragment>
    )
}
