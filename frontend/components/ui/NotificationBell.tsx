'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getNotifications, NotificationItem, markNotificationRead, markAllNotificationsRead } from '@/services/api'
import { Popover, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'
import { useNotificationStream } from '@/hooks/useNotificationStream'

export function NotificationBell() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const router = useRouter()

    // Real-time notification stream
    const { latestNotification, isConnected } = useNotificationStream()

    const loadNotifications = useCallback(async () => {
        try {
            const data = await getNotifications()
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.read).length)
        } catch {
            console.error('Failed to load notifications')
        }
    }, [])

    // Load initial notifications
    useEffect(() => {
        loadNotifications()
    }, [loadNotifications])

    // Listen for new notifications from SSE stream
    useEffect(() => {
        if (latestNotification) {
            // Reload notifications when a new one arrives
            loadNotifications()

            // Play notification sound
            try {
                const audio = new Audio('/notification.mp3')
                audio.volume = 0.5
                audio.play().catch(() => {
                    // User hasn't interacted with page yet, sound blocked
                    console.log('Sound blocked by browser')
                })
            } catch (e) {
                console.log('Sound not available')
            }

            // Show rich notification toast (top-right, custom content)
            toast.custom(
                (t) => (
                    <div
                        className={`${t.visible ? 'animate-enter' : 'animate-leave'
                            } max-w-lg w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-yellow-400`}
                    >
                        <div className="flex-1 w-0 p-5">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 pt-0.5">
                                    <div className="h-11 w-11 rounded-full bg-yellow-100 flex items-center justify-center">
                                        <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-gray-900">
                                        {latestNotification.title || 'New Notification'}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                        {latestNotification.message || latestNotification.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex border-l border-gray-200">
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ),
                {
                    duration: 6000,
                    position: 'top-right',
                }
            )
        }
    }, [latestNotification, loadNotifications])

    const handleNotificationClick = async (notification: NotificationItem, close: () => void) => {
        close()
        if (!notification.read) {
            try {
                await markNotificationRead(notification.id)
                loadNotifications()
            } catch { }
        }
        router.push('/notifications')
    }

    const handleMarkAllRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)

        try {
            await markAllNotificationsRead()
            toast.success('All marked as read')
            // Don't reload immediately to preserve the optimistic state since API is mock
            // loadNotifications() 
        } catch {
            toast.error('Failed to mark all as read')
            loadNotifications() // Revert on error
        }
    }

    return (
        <Popover className="relative">
            {({ open, close }) => (
                <>
                    <Popover.Button className={`p-2 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all focus:outline-none ${open ? 'text-zinc-900 bg-zinc-100' : ''}`}>
                        <span className="sr-only">View notifications</span>
                        {/* Wrapper to position dot relative to icon */}
                        <div className="relative">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </div>
                    </Popover.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <Popover.Panel className="absolute right-0 z-50 mt-2 w-96 transform px-2 sm:px-0">
                            <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5">
                                <div className="relative flex flex-col gap-0 bg-white p-0 max-h-[500px] overflow-y-auto">

                                    {/* Header */}
                                    <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white sticky top-0 z-10">
                                        <h3 className="text-sm font-bold text-zinc-900">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={handleMarkAllRead}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>

                                    {/* List */}
                                    <div className="p-2 space-y-1">
                                        {notifications.length === 0 ? (
                                            <div className="text-center py-8">
                                                <p className="text-sm text-zinc-500">No notifications yet.</p>
                                            </div>
                                        ) : (
                                            notifications.slice(0, 5).map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleNotificationClick(item, close)}
                                                    className={`group w-full text-left p-3 rounded-xl transition-all ${!item.read ? 'bg-yellow-50 hover:bg-yellow-100/50' : 'hover:bg-zinc-50'}`}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className={`text-sm font-bold ${!item.read ? 'text-zinc-900' : 'text-zinc-600'}`}>
                                                            {item.title}
                                                        </p>
                                                        <span className="text-[10px] text-zinc-400 whitespace-nowrap ml-2">
                                                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true }).replace('about ', '')}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs line-clamp-2 ${!item.read ? 'text-zinc-800' : 'text-zinc-500'}`}>
                                                        {item.message}
                                                    </p>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="bg-zinc-50 p-3 border-t border-zinc-100">
                                    <button
                                        onClick={() => {
                                            close()
                                            router.push('/notifications')
                                        }}
                                        className="w-full rounded-xl px-4 py-2.5 bg-white border border-zinc-200 text-sm font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-all shadow-sm"
                                    >
                                        View all notifications
                                    </button>
                                </div>
                            </div>
                        </Popover.Panel>
                    </Transition>
                </>
            )}
        </Popover>
    )
}
