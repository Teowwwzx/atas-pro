import React, { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { SponsorBadge } from '../ui/SponsorBadge'

interface SponsorInfoModalProps {
    isOpen: boolean
    onClose: () => void
}

export function SponsorInfoModal({ isOpen, onClose }: SponsorInfoModalProps) {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-zinc-100">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-black leading-6 text-zinc-900 mb-4 flex items-center gap-2"
                                >
                                    <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Sponsor Tiers
                                </Dialog.Title>
                                
                                <div className="mt-4 space-y-4">
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100">
                                        <div className="shrink-0 mt-1">
                                            <SponsorBadge tier="Bronze" size="sm" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-amber-900">Bronze Sponsor</h4>
                                            <p className="text-sm text-amber-800/80 mt-1">Sponsored 1+ events. A verified contributor helping the community grow.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200">
                                        <div className="shrink-0 mt-1">
                                            <SponsorBadge tier="Silver" size="sm" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">Silver Sponsor</h4>
                                            <p className="text-sm text-slate-700 mt-1">Sponsored 5+ events. A dedicated partner with significant community impact.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200">
                                        <div className="shrink-0 mt-1">
                                            <SponsorBadge tier="Gold" size="sm" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-yellow-900">Gold Sponsor</h4>
                                            <p className="text-sm text-yellow-800/80 mt-1">Sponsored 10+ events. A top-tier champion driving the ecosystem forward.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-xl border border-transparent bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 transition-colors shadow-lg shadow-zinc-200"
                                        onClick={onClose}
                                    >
                                        Got it
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
