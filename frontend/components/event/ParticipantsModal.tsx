'use client'

import React, { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { getEventParticipants } from '@/services/api'
import { EventParticipantDetails } from '@/services/api.types'
import Link from 'next/link'

interface ParticipantsModalProps {
    isOpen: boolean
    onClose: () => void
    eventId: string
    eventTitle: string
}

export function ParticipantsModal({
    isOpen,
    onClose,
    eventId,
    eventTitle,
}: ParticipantsModalProps) {
    const [participants, setParticipants] = useState<EventParticipantDetails[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    useEffect(() => {
        if (isOpen && eventId) {
            fetchParticipants()
        }
    }, [isOpen, eventId])

    const fetchParticipants = async () => {
        setLoading(true)
        setError(false)
        try {
            // Filter: public visibility, active user status, joined/accepted status
            const data = await getEventParticipants(eventId, {
                user_visibility: ['public'],
                user_status: ['active'],
                status: ['accepted', 'attended']
            })
            // Filter further if needed (e.g. strict status check if API didn't handle it perfectly)
            // But API should handle it. The backend router I edited accepts status list.
            // I should pass status=['accepted', 'attended'] as these are the "joined" states.
            
            setParticipants(data)
        } catch (err) {
            console.error('Failed to fetch participants', err)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    // Function to reload on retry
    const handleRetry = () => {
        fetchParticipants()
    }

    return (
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
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
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
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-zinc-100 flex flex-col max-h-[80vh]">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-bold leading-6 text-zinc-900 flex justify-between items-center mb-4 shrink-0"
                                >
                                    <span>Participants</span>
                                    <button
                                        onClick={onClose}
                                        className="text-zinc-400 hover:text-zinc-500 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </Dialog.Title>

                                <div className="overflow-y-auto flex-1 pr-2">
                                    {loading ? (
                                        <div className="space-y-4">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                                    <div className="w-10 h-10 bg-zinc-200 rounded-full" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-4 bg-zinc-200 rounded w-1/3" />
                                                        <div className="h-3 bg-zinc-200 rounded w-1/4" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : error ? (
                                        <div className="text-center py-8 text-zinc-500">
                                            <p className="mb-2">Failed to load participants.</p>
                                            <button 
                                                onClick={handleRetry}
                                                className="text-sm font-bold text-violet-600 hover:text-violet-700 underline"
                                            >
                                                Try Again
                                            </button>
                                        </div>
                                    ) : participants.length === 0 ? (
                                        <div className="text-center py-8 text-zinc-500">
                                            No public participants found.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {participants.map((participant) => (
                                                <div key={participant.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                                                    <Link href={`/profile/${participant.user_id}`} className="shrink-0">
                                                        <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden">
                                                            {participant.user_avatar ? (
                                                                <img 
                                                                    src={participant.user_avatar} 
                                                                    alt={participant.user_full_name || 'User'} 
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
                                                                    {(participant.user_full_name || participant.name || '?').charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </Link>
                                                    <div className="flex-1 min-w-0">
                                                        <Link href={`/profile/${participant.user_id}`} className="block truncate font-bold text-zinc-900 hover:text-violet-600 transition-colors">
                                                            {participant.user_full_name || participant.name || 'Unknown User'}
                                                        </Link>
                                                        <p className="truncate text-xs text-zinc-500">
                                                            {participant.user_title || 'Participant'}
                                                        </p>
                                                    </div>
                                                    {/* Optional: Add follow button or status here */}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
