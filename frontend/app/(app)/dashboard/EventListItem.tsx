'use client'

import React, { Fragment } from 'react'
import Link from 'next/link'
import { Menu, Transition } from '@headlessui/react'
import { MyEventItem } from '@/services/api.types'

interface EventListItemProps {
    event: MyEventItem
    onDelete?: (id: string) => void
}

export function EventListItem({ event, onDelete }: EventListItemProps) {
    const isOrganizer = event.my_role === 'organizer' || event.my_role === 'committee'

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-800 border-green-200'
            case 'ended':
                return 'bg-zinc-100 text-zinc-800 border-zinc-200'
            case 'draft':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    return (
        <div className="group bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all duration-200 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Date Box */}
            <div className="flex-shrink-0 w-16 h-16 bg-zinc-50 rounded-xl flex flex-col items-center justify-center border border-zinc-100">
                <span className="text-xs font-bold text-zinc-400 uppercase">
                    {new Date(event.start_datetime).toLocaleString('default', { month: 'short' })}
                </span>
                <span className="text-xl font-black text-zinc-900">
                    {new Date(event.start_datetime).getDate()}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border capitalize ${getStatusColor(event.status)}`}>
                        {event.status}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200 capitalize">
                        {event.my_role}
                    </span>
                </div>
                <Link href={`/events/${event.event_id}`} className="block">
                    <h3 className="text-lg font-bold text-zinc-900 truncate group-hover:text-yellow-600 transition-colors">
                        {event.title}
                    </h3>
                </Link>
                <div className="flex items-center text-sm text-zinc-500 mt-1 gap-4">
                    <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(event.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center capitalize">
                        <svg className="w-4 h-4 mr-1 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {event.format?.replace('_', ' ') || 'Event'}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                <Link
                    href={`/events/${event.event_id}`}
                    className="flex-1 sm:flex-none text-center px-4 py-2 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-colors"
                >
                    View
                </Link>

                <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors">
                        <span className="sr-only">Options</span>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                            <div className="px-1 py-1">
                                {isOrganizer && (
                                    <Menu.Item>
                                        {({ active }: { active: boolean }) => (
                                            <Link
                                                href={`/events/${event.event_id}?edit=true`}
                                                className={`${active ? 'bg-yellow-50 text-zinc-900' : 'text-zinc-700'
                                                    } group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium`}
                                            >
                                                Edit Event
                                            </Link>
                                        )}
                                    </Menu.Item>
                                )}
                                <Menu.Item>
                                    {({ active }: { active: boolean }) => (
                                        <Link
                                            href={`/events/${event.event_id}/participants`}
                                            className={`${active ? 'bg-yellow-50 text-zinc-900' : 'text-zinc-700'
                                                } group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium`}
                                        >
                                            Participants
                                        </Link>
                                    )}
                                </Menu.Item>
                                {isOrganizer && onDelete && (
                                    <Menu.Item>
                                        {({ active }: { active: boolean }) => (
                                            <button
                                                onClick={() => onDelete(event.event_id)}
                                                className={`${active ? 'bg-red-50 text-red-700' : 'text-red-600'
                                                    } group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium`}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </Menu.Item>
                                )}
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </div>
    )
}
