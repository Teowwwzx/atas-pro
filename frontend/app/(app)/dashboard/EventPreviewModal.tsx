'use client'

import React, { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { EventDetails } from '@/services/api.types'
import { format } from 'date-fns'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { formatEventDate, formatEventTimeRange } from '@/lib/date'

interface EventPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    event: EventDetails | null
}

export function EventPreviewModal({ isOpen, onClose, event }: EventPreviewModalProps) {
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
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 md:p-8">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-500"
                            enterFrom="opacity-0 translate-y-8 scale-95"
                            enterTo="opacity-100 translate-y-0 scale-100"
                            leave="ease-in duration-300"
                            leaveFrom="opacity-100 translate-y-0 scale-100"
                            leaveTo="opacity-0 translate-y-8 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-7xl transform transition-all relative">

                                {/* Close Button (Outside) */}
                                <button
                                    onClick={onClose}
                                    className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <span className="text-sm font-medium">Close Preview</span>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                {/* Browser Frame Container */}
                                <div className="bg-zinc-100 rounded-[1.5rem] overflow-hidden shadow-2xl ring-8 ring-white/10">

                                    {/* Browser Toolbar */}
                                    <div className="bg-white border-b border-zinc-200 px-5 py-3.5 flex items-center gap-6 select-none">
                                        <div className="flex gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500/10" />
                                            <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500/10" />
                                            <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500/10" />
                                        </div>
                                        <div className="flex-1 max-w-2xl mx-auto">
                                            <div className="bg-zinc-100/80 hover:bg-zinc-100 transition-colors rounded-lg px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-zinc-500 font-medium">
                                                <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                                <span>atas.com/events/{event.id.slice(0, 8)}...</span>
                                            </div>
                                        </div>
                                        <div className="w-16 flex justify-end">
                                            <div className="w-8 h-8 rounded-full bg-zinc-100" />
                                        </div>
                                    </div>

                                    {/* Scrolable Content Area (Viewport) */}
                                    <div className="h-[80vh] overflow-y-auto bg-zinc-50 scrollbar-hide">
                                        {/* Mocking the actual Event Details Page Layout */}
                                        <div className="max-w-[95%] xl:max-w-screen-2xl mx-auto px-4 py-8 pointer-events-none select-none">
                                            {/* Pointer events none to prevent interaction in preview mode if desired, or remove to allow scrolling/clicking mock buttons */}

                                            <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-zinc-100">
                                                {/* Header Image */}
                                                <div className="relative h-[450px] bg-zinc-900">
                                                    <ImageWithFallback
                                                        src={event.cover_url || `https://placehold.co/1200x600/png?text=${encodeURIComponent(event.title)}`}
                                                        fallbackSrc={`https://placehold.co/1200x600/png?text=${encodeURIComponent(event.title)}`}
                                                        alt={event.title}
                                                        className="object-cover"
                                                        fill
                                                        unoptimized={false}
                                                        priority
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent opacity-90" />

                                                    {/* Badges Top Right */}
                                                    <div className="absolute top-6 right-6 z-20 flex gap-2">
                                                        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold uppercase tracking-wider">
                                                            {event.format.replace('_', ' ')}
                                                        </span>
                                                        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold uppercase tracking-wider">
                                                            {event.type}
                                                        </span>
                                                    </div>

                                                    <div className="absolute top-6 right-6 z-20 flex gap-2">
                                                        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold uppercase tracking-wider">
                                                            {event.format.replace('_', ' ')}
                                                        </span>
                                                        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold uppercase tracking-wider">
                                                            {event.type}
                                                        </span>
                                                    </div>

                                                    <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 w-full">
                                                        <div className="max-w-5xl mx-auto w-full space-y-3">
                                                            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tight">
                                                                {event.title}
                                                            </h1>
                                                            <div className="flex flex-col gap-2 text-zinc-100 text-sm md:text-base">
                                                                <div className="flex items-center gap-2">
                                                                    <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                    <span className="font-medium">{formatEventDate(event.start_datetime)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    <span className="font-medium">{formatEventTimeRange(event.start_datetime, event.end_datetime)}</span>
                                                                </div>
                                                                {(event.venue_remark || (event.type === 'online')) && (
                                                                    <div className="flex items-center gap-2">
                                                                        <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        </svg>
                                                                        <span className="truncate max-w-[300px] font-medium">
                                                                            {event.type === 'online' ? 'Online Event' : event.venue_remark || 'Venue TBA'}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Content Body */}
                                                <div className="px-6 md:px-12 py-8 bg-white">
                                                    <div className="max-w-5xl mx-auto w-full">
                                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                                                            {/* Main Column */}
                                                            <div className="lg:col-span-8 space-y-8">

                                                                <div>
                                                                    <h3 className="text-lg font-bold text-zinc-900 mb-4 uppercase tracking-wide">About Event</h3>
                                                                    <div className="prose prose-zinc max-w-none text-zinc-600 whitespace-pre-wrap leading-relaxed">
                                                                        {event.description || 'No description provided.'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Sidebar Column */}
                                                            <div className="lg:col-span-4 space-y-6">
                                                                {/* Registration Card Compact */}
                                                                <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm">
                                                                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Registration</h3>

                                                                    <div className="flex items-end justify-between mb-6">
                                                                        {event.registration_type === 'paid' && (
                                                                            <div>
                                                                                <span className="block text-xs text-zinc-400 font-bold mb-1">Price</span>
                                                                                <span className="text-2xl font-black text-zinc-900">$$$</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <button className="w-full py-3 bg-yellow-400 text-zinc-900 rounded-xl font-bold text-sm shadow-sm hover:bg-yellow-300">
                                                                        Register Now
                                                                    </button>
                                                                    <p className="mt-3 text-center text-[10px] text-zinc-400 font-medium">Limited spots available</p>
                                                                </div>

                                                                {/* Organizer Section */}
                                                                <div className="space-y-4">
                                                                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Hosted By</h3>
                                                                    <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-3">
                                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0 border border-indigo-200 overflow-hidden">
                                                                            {event.organizer_avatar ? (
                                                                                <img src={event.organizer_avatar} alt={event.organizer_name || 'Organizer'} className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <span>{(event.organizer_name || 'Org').charAt(0)}</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="font-bold text-zinc-900 text-sm truncate">{event.organizer_name || 'Event Organizer'}</div>
                                                                            <div className="text-xs text-zinc-500 font-medium">Event Organizer</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
