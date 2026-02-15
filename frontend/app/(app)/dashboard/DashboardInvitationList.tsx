'use client'

import React, { useState, useEffect } from 'react'
import { EventInvitationResponse } from '@/services/api.types'
import { getMyRequests } from '@/services/api'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

interface DashboardInvitationListProps {
    requests: EventInvitationResponse[]
    layoutMode?: 'list' | 'grid'
    showTabs?: boolean
}

export function DashboardInvitationList({ requests: initialRequests, layoutMode = 'list', showTabs = true }: DashboardInvitationListProps) {
    const router = useRouter()
    const [subTab, setSubTab] = useState<'pending' | 'history'>('pending')
    const [historyRequests, setHistoryRequests] = useState<EventInvitationResponse[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [historyFetched, setHistoryFetched] = useState(false)

    const [page, setPage] = useState(0)

    useEffect(() => {
        if (subTab === 'history' && !historyFetched) {
            setLoadingHistory(true)
            getMyRequests('history')
                .then(data => {
                    setHistoryRequests(data)
                    setHistoryFetched(true)
                })
                .catch(() => toast.error('Failed to load history'))
                .finally(() => setLoadingHistory(false))
        }
        setPage(0) // Reset page on tab switch
    }, [subTab, historyFetched])

    const activeRequests = subTab === 'pending' ? initialRequests : historyRequests

    const PAGE_SIZE = layoutMode === 'grid' ? 6 : 5
    const totalPages = Math.ceil(activeRequests.length / PAGE_SIZE)
    const visibleRequests = activeRequests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    const goNext = () => setPage(p => Math.min(p + 1, totalPages - 1))
    const goPrev = () => setPage(p => Math.max(p - 1, 0))

    return (
        <div className="space-y-6">
            {/* Sub Tabs */}
            {showTabs && (
                <div className="flex space-x-4 border-b border-zinc-100">
                    <button
                        onClick={() => setSubTab('pending')}
                        className={`pb-3 text-sm font-bold transition-colors border-b-2 ${subTab === 'pending' ? 'border-yellow-400 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                    >
                        Pending ({initialRequests.length})
                    </button>
                    <button
                        onClick={() => setSubTab('history')}
                        className={`pb-3 text-sm font-bold transition-colors border-b-2 ${subTab === 'history' ? 'border-yellow-400 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                    >
                        History
                    </button>
                </div>
            )}

            {loadingHistory && subTab === 'history' ? (
                <div className="py-12 text-center text-zinc-500">Loading...</div>
            ) : activeRequests.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-zinc-100 flex flex-col items-center justify-center h-64">
                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 text-zinc-300">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">No {subTab} invitations</h3>
                    <p className="text-zinc-500 text-sm">You're all caught up!</p>
                </div>
            ) : (
                <div className={`w-full animate-fadeIn ${layoutMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}`}>
                    {visibleRequests.map(req => {
                        const eventDate = new Date(req.event.start_datetime)
                        const dateStr = eventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        const timeStr = eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                        const hasLocation = req.event.venue_remark || (req.event as any).location

                        // Determine colors
                        const typeColor = req.event.type === 'online' ? 'bg-blue-100 text-blue-700' :
                            req.event.type === 'physical' ? 'bg-orange-100 text-orange-700' :
                                'bg-purple-100 text-purple-700'

                        return (
                            <div key={req.id} onClick={() => router.push(`/events/${req.event.id}`)} className={`bg-white rounded-2xl border border-zinc-100 p-4 hover:border-yellow-400 hover:shadow-md transition-all group flex gap-4 cursor-pointer ${layoutMode === 'list' ? 'flex-col md:flex-row items-start md:items-center' : 'flex-col'}`}>
                                <div className="flex w-full gap-4">
                                    {/* Date Box */}
                                    <div className="flex-shrink-0 w-16 h-16 bg-zinc-50 rounded-xl flex flex-col items-center justify-center border border-zinc-100 text-zinc-900 font-bold group-hover:bg-yellow-50 group-hover:border-yellow-200 group-hover:text-yellow-700 transition-colors">
                                        <span className="text-xs uppercase text-zinc-500 group-hover:text-yellow-600">{eventDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                                        <span className="text-2xl leading-none">{eventDate.getDate()}</span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${req.role === 'speaker' ? 'bg-rose-100 text-rose-700' :
                                                req.role === 'sponsor' ? 'bg-cyan-100 text-cyan-700' :
                                                    'bg-zinc-100 text-zinc-600'
                                                }`}>
                                                {req.role}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${typeColor}`}>
                                                {req.event.type}
                                            </span>
                                            {(req.proposal_id || req.proposal) && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-yellow-100 text-yellow-700">
                                                    proposal attached
                                                </span>
                                            )}
                                            {subTab === 'history' && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {req.status}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-black text-zinc-900 truncate cursor-pointer hover:underline" onClick={() => router.push(`/events/${req.event.id}`)}>
                                            {req.event.title}
                                        </h3>

                                        <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1">
                                            <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {timeStr}
                                            </span>
                                            {hasLocation && (
                                                <span className="flex items-center gap-1 truncate max-w-[200px]">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    {req.event.venue_remark || (req.event as any).location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className={`flex items-center gap-2 mt-2 md:mt-0 ${layoutMode === 'list' ? 'w-full md:w-auto' : 'w-full'}`}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/requests/${req.id}`) }}
                                        className="flex-1 px-4 py-2 bg-zinc-900 text-white border border-zinc-900 rounded-lg font-bold text-sm hover:bg-zinc-800 transition-all active:scale-95 shadow-sm"
                                    >
                                        View Request
                                    </button>
                                </div>
                            </div>
                        )
                    })}

                    {/* Pagination Controls */}
                    {activeRequests.length > PAGE_SIZE && (
                        <div className={`flex justify-center gap-2 pt-4 ${layoutMode === 'grid' ? 'col-span-1 md:col-span-2' : ''}`}>
                            <button
                                onClick={goPrev}
                                disabled={page === 0}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${page === 0 ? 'border-zinc-100 text-zinc-300 cursor-not-allowed' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <span className="flex items-center text-sm font-medium text-zinc-500">
                                Page {page + 1} of {totalPages}
                            </span>
                            <button
                                onClick={goNext}
                                disabled={page >= totalPages - 1}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${page >= totalPages - 1 ? 'border-zinc-100 text-zinc-300 cursor-not-allowed' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
