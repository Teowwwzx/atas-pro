import React, { useState } from 'react'
import { MyEventItem, ProfileResponse, UserMeResponse } from '@/services/api.types'
import { DashboardEventList } from './DashboardEventList'
import { EventBadge } from '@/components/ui/EventBadge'
import { DashboardReviewsModal } from './DashboardReviewsModal'

interface DashboardTabOrganizedProps {
    events: MyEventItem[]
    user: ProfileResponse | null
    me: UserMeResponse | null
    onSelect: (event: MyEventItem) => void
    onCreate: () => void
    onProUpgrade: () => void
}

export function DashboardTabOrganized({ events, user, me, onSelect, onCreate, onProUpgrade }: DashboardTabOrganizedProps) {
    const [subTab, setSubTab] = useState<'upcoming' | 'past'>('upcoming')
    const [selectedEvent, setSelectedEvent] = useState<MyEventItem | null>(null)

    const now = new Date()
    const upcomingEvents = events.filter(e => new Date(e.end_datetime) > now)
    const pastEvents = events.filter(e => new Date(e.end_datetime) <= now).sort((a, b) => new Date(b.end_datetime).getTime() - new Date(a.end_datetime).getTime())

    return (
        <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex space-x-4 border-b border-zinc-100">
                <button
                    onClick={() => setSubTab('upcoming')}
                    className={`pb-3 text-sm font-bold transition-colors border-b-2 ${subTab === 'upcoming' ? 'border-yellow-400 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                >
                    Upcoming & Ongoing ({upcomingEvents.length})
                </button>
                <button
                    onClick={() => setSubTab('past')}
                    className={`pb-3 text-sm font-bold transition-colors border-b-2 ${subTab === 'past' ? 'border-yellow-400 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                >
                    Past Events ({pastEvents.length})
                </button>
            </div>

            {subTab === 'upcoming' ? (
                <DashboardEventList 
                    events={upcomingEvents} 
                    user={user} 
                    me={me} 
                    onSelect={onSelect} 
                    onCreate={onCreate} 
                    onProUpgrade={onProUpgrade} 
                    mode="organized" 
                />
            ) : (
                <div className="space-y-4">
                    {pastEvents.length === 0 ? (
                         <div className="text-center py-12 bg-zinc-50 rounded-3xl">
                            <h3 className="text-lg font-bold text-zinc-900">No past events</h3>
                            <p className="text-zinc-500">You haven't organized any events that have ended yet.</p>
                        </div>
                    ) : (
                        pastEvents.map(event => (
                            <div key={event.event_id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div 
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors"
                                    onClick={() => setSelectedEvent(event)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-zinc-100 flex-shrink-0 overflow-hidden relative">
                                            {event.cover_url ? (
                                                <img src={event.cover_url} alt={event.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-zinc-900">{event.title}</h4>
                                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                                                <span>{new Date(event.start_datetime).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <EventBadge type="type" value={event.type} className="!text-[10px] !px-1.5 !py-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-zinc-500">
                                            View Reviews
                                        </span>
                                        <svg 
                                            className="w-5 h-5 text-zinc-400"
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <DashboardReviewsModal 
                isOpen={!!selectedEvent} 
                onClose={() => setSelectedEvent(null)} 
                event={selectedEvent} 
            />
        </div>
    )
}
