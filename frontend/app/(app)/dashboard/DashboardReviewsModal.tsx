'use client'

import React, { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { DashboardTabReviews } from './DashboardTabReviews'
import { MyEventItem } from '@/services/api.types'

interface DashboardReviewsModalProps {
    isOpen: boolean
    onClose: () => void
    event: MyEventItem | null
}

export function DashboardReviewsModal({ isOpen, onClose, event }: DashboardReviewsModalProps) {
    if (!event) return null

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
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-6 border-b border-zinc-100 pb-4">
                                    <div>
                                        <Dialog.Title as="h3" className="text-xl font-black text-zinc-900">
                                            Event Reviews
                                        </Dialog.Title>
                                        <p className="text-sm text-zinc-500 mt-1">{event.title}</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-zinc-400 hover:text-zinc-600 p-2 rounded-full hover:bg-zinc-100 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="max-h-[70vh] overflow-y-auto pr-2">
                                    <DashboardTabReviews 
                                        event={{ ...event, id: event.event_id } as any} 
                                        isOrganizer={true} 
                                    />
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
