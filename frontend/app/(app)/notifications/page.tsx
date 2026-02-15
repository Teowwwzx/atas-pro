'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { getNotifications, markNotificationRead, NotificationItem } from '@/services/api'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [loading, setLoading] = useState(true)

    // Filter states
    const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all')
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        loadNotifications()
    }, [])

    const loadNotifications = async () => {
        try {
            const data = await getNotifications()
            setNotifications(data)
        } catch (error) {
            console.error('Failed to load notifications')
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        await markNotificationRead(id)
    }

    const handleMarkAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        // Call API for each unread notification
        await Promise.all(unreadIds.map(id => markNotificationRead(id)))
    }

    // Filter and sort notifications
    const filteredNotifications = useMemo(() => {
        let filtered = [...notifications]

        // Status filter
        if (filterStatus === 'unread') {
            filtered = filtered.filter(n => !n.read)
        } else if (filterStatus === 'read') {
            filtered = filtered.filter(n => n.read)
        }

        // Date filter
        const now = new Date()
        if (dateFilter !== 'all') {
            filtered = filtered.filter(n => {
                const notifDate = new Date(n.created_at)
                const diffDays = Math.floor((now.getTime() - notifDate.getTime()) / (1000 * 60 * 60 * 24))

                if (dateFilter === 'today') return diffDays === 0
                if (dateFilter === 'week') return diffDays <= 7
                if (dateFilter === 'month') return diffDays <= 30
                return true
            })
        }

        return filtered
    }, [notifications, filterStatus, dateFilter])

    // Pagination
    const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage)
    const paginatedNotifications = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredNotifications.slice(start, start + itemsPerPage)
    }, [filteredNotifications, currentPage])

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [filterStatus, dateFilter])

    const unreadCount = notifications.filter(n => !n.read).length

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
                < Skeleton height="60px" className="rounded-2xl" />
                < Skeleton height="80px" className="rounded-2xl" />
                < Skeleton height="80px" className="rounded-2xl" />
                < Skeleton height="80px" className="rounded-2xl" />
            </div >
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                < div >
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Notifications</h1>
                    {
                        unreadCount > 0 && (
                            <p className="text-sm text-zinc-500 mt-1">
                                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                            </p >
                        )
                    }
                </div >
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="px-4 py-2 text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                    >
                        Mark all as read
                    </button >
                )
                }
            </div >
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Status Filter */}
                    <div className="flex-1">
                        <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 mb-3 uppercase tracking-wide">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            Status Filter
                        </label>
                        <div className="relative">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                                className="w-full px-4 py-3 pr-10 text-sm font-semibold text-zinc-900 bg-zinc-50 rounded-xl border border-zinc-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none appearance-none cursor-pointer"
                            >
                                <option value="all">All Notifications</option>
                                <option value="unread">Unread Only {unreadCount > 0 ? `(${unreadCount})` : ''}</option>
                                <option value="read">Read Only</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Date Filter */}
                    <div className="flex-1">
                        <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 mb-3 uppercase tracking-wide">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Time Period
                        </label>
                        <div className="relative">
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
                                className="w-full px-4 py-3 pr-10 text-sm font-semibold text-zinc-900 bg-zinc-50 rounded-xl border border-zinc-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none appearance-none cursor-pointer"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">Last 30 Days</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Count */}
                <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center gap-2 text-sm text-zinc-600">
                    <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="font-medium">
                        Showing <span className="font-bold text-zinc-900">{filteredNotifications.length}</span> notification{filteredNotifications.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Notifications List */}
            {
                filteredNotifications.length === 0 ? (
                    <EmptyState
                        title={filterStatus === 'unread' ? 'No unread notifications' : 'No notifications found'}
                        description={
                            filterStatus === 'unread'
                                ? "You're all caught up!"
                                : 'Try adjusting your filters'
                        }
                    />
                ) : (
                    <>
                        <div className="space-y-3">
                            {paginatedNotifications.map((notification) => {
                                const hasLink = notification.link && notification.link.trim() !== ''

                                const notificationContent = (
                                    <>
                                        <div
                                            className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${notification.read ? 'bg-transparent' : 'bg-blue-500'
                                                }`}
                                        />

                                        <div className="ml-4 flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-3">
                                                <h3
                                                    className={`text-base font-bold ${notification.read ? 'text-zinc-900' : 'text-blue-900'
                                                        }`}
                                                >
                                                    {notification.title}
                                                </h3>
                                                <span className="text-xs font-medium text-zinc-400 whitespace-nowrap flex-shrink-0">
                                                    {new Date(notification.created_at).toLocaleDateString()}
                                                </span>
                                            </div >
                                            <p
                                                className={`mt-1 text-sm ${notification.read ? 'text-zinc-500' : 'text-blue-800/80'
                                                    }`}
                                            >
                                                {notification.message}
                                            </p>
                                            {
                                                hasLink && (
                                                    <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:text-blue-700">
                                                        < svg
                                                            className="w-3.5 h-3.5 flex-shrink-0"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2.5"
                                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                            />
                                                        </svg >
                                                        <span>View Details</span>
                                                    </div >
                                                )
                                            }
                                        </div >

                                        {hasLink && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                                < svg
                                                    className="w-5 h-5 text-blue-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M9 5l7 7-7 7"
                                                    />
                                                </svg >
                                            </div >
                                        )}
                                    </>
                                )

                                return hasLink ? (
                                    <Link
                                        key={notification.id}
                                        href={notification.link!}
                                        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                                        className={`group flex items-start p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:border-blue-200 ${notification.read
                                            ? 'bg-white border-zinc-100'
                                            : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50'
                                            }`}
                                    >
                                        {notificationContent}
                                    </Link>
                                ) : (
                                    <div
                                        key={notification.id}
                                        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                                        className={`group flex items-start p-5 rounded-2xl border transition-all ${notification.read
                                            ? 'bg-white border-zinc-100'
                                            : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50 cursor-pointer'
                                            }`}
                                    >
                                        {notificationContent}
                                    </div>
                                )
                            })}
                        </div >

                        {/* Pagination */}
                        {
                            totalPages > 1 && (
                                <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-6">
                                    < div className="text-sm text-zinc-500">
                                        Page {currentPage} of {totalPages}
                                    </div >
                                    <div className="flex gap-2">
                                        < button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 text-sm font-bold rounded-lg border border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            Previous
                                        </button >
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 text-sm font-bold rounded-lg border border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all\"
                                        >
                                            Next
                                        </button >
                                    </div >
                                </div >
                            )}
                    </>
                )}
        </div >
    )
}
