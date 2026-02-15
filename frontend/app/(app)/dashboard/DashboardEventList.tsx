import React, { useState, useRef, useEffect } from 'react'
import { MyEventItem, ProfileResponse, UserMeResponse } from '@/services/api.types'
import Link from 'next/link'
import { DashboardProModal } from '@/components/dashboard/DashboardProModal'
import { EventBadge } from '@/components/ui/EventBadge'
import { ImagePreviewModal } from '@/components/ui/ImagePreviewModal'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'

interface DashboardEventListProps {
    events: MyEventItem[]
    user: ProfileResponse | null
    me: UserMeResponse | null
    onSelect: (event: MyEventItem) => void
    onCreate: () => void
    onProUpgrade: () => void
    mode?: 'all' | 'schedule' | 'organized'
}

export function DashboardEventList({ events, user, me, onSelect, onCreate, onProUpgrade, mode = 'all' }: DashboardEventListProps) {
    const [showProModal, setShowProModal] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [subTab, setSubTab] = useState<'upcoming' | 'past'>('upcoming')

    const organizedEvents = events.filter(e => e.my_role && ['organizer', 'committee'].includes(e.my_role) && e.my_status === 'accepted')
    const joinedEvents = events.filter(e => e.my_role && !['organizer', 'committee'].includes(e.my_role))
    
    const upcomingJoinedEvents = joinedEvents.filter(e => new Date(e.end_datetime) > new Date())
    const pastJoinedEvents = joinedEvents.filter(e => new Date(e.end_datetime) <= new Date())

    const handleCreateClick = () => {
        // Check if user needs Dashboard Pro
        if (!me?.is_dashboard_pro && organizedEvents.length >= 1) {
            setShowProModal(true)
        } else {
            onCreate()
        }
    }
    // ... (rest of local setup) 


    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>, url: string) => {
        e.stopPropagation()
        setPreviewImage(url)
    }

    // Helper components defined outside to avoid re-creation on render
    interface CardProps {
        event: MyEventItem
        onSelect: (event: MyEventItem) => void
        handleImageClick: (e: React.MouseEvent<HTMLImageElement>, url: string) => void
    }

    const CompactEventCard = ({ event, onSelect, handleImageClick }: CardProps) => (
        <div
            onClick={() => onSelect(event)}
            className="group bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full min-h-[300px]"
        >
            {/* Cover Image */}
            <div className="h-40 w-full bg-zinc-100 flex-shrink-0 relative overflow-hidden">
                {event.cover_url ? (
                    <ImageWithFallback
                        src={event.cover_url}
                        fallbackSrc={`https://placehold.co/400x300/png?text=${encodeURIComponent(event.title)}`}
                        alt={event.title}
                        fill
                        onClick={(e) => handleImageClick(e, event.cover_url!)}
                        className="object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                        unoptimized={false}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
                        <svg className="w-8 h-8 text-yellow-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
                {/* Status Badge overlay */}
                <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
                    <EventBadge type="status" value={event.status} />
                </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
                <div className="flex gap-2 mb-2 flex-wrap">
                    <EventBadge type="type" value={event.type} className="!bg-zinc-100 !text-zinc-500 !border-0" />
                </div>

                <h3 className="text-base font-black text-zinc-900 mb-1 group-hover:text-yellow-600 transition-colors line-clamp-2">{event.title}</h3>
                <p className="text-xs text-zinc-500 font-medium mb-3">
                    {new Date(event.start_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-50">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {event.my_role === 'organizer' ? 'Organizing' : event.my_role || 'Participant'}
                    </span>
                    <svg className="w-4 h-4 text-zinc-300 group-hover:text-yellow-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </div>
            </div>
        </div>
    )

    const CreateMoreCard = ({ onClick }: { onClick: () => void }) => (
        <div
            onClick={onClick}
            className="group bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-300 p-4 hover:border-yellow-400 hover:bg-yellow-50 transition-all cursor-pointer flex flex-col items-center justify-center h-full min-h-[300px]"
        >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-zinc-400 group-hover:text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
            </div>
            <span className="text-sm font-bold text-zinc-600 group-hover:text-zinc-900">Create Event</span>
            <span className="text-xs text-zinc-400 mt-1">Add another event</span>
        </div>
    )



    // --- Pagination Logic ---
    const PAGE_SIZE = 3

    const CarouselSection = ({ title, subTitle, items, isOrganized = false }: { title: string, subTitle: string, items: any[], isOrganized?: boolean }) => {
        const [page, setPage] = useState(0)
        const totalPages = Math.ceil(items.length / PAGE_SIZE)

        // Reset page if items change (e.g. deletion)
        useEffect(() => {
            if (page >= totalPages && totalPages > 0) {
                setPage(totalPages - 1)
            }
        }, [items.length, totalPages])

        const visibleItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
        const canNext = page < totalPages - 1
        const canPrev = page > 0

        const goNext = () => setPage(p => Math.min(p + 1, totalPages - 1))
        const goPrev = () => setPage(p => Math.max(p - 1, 0))

        if (items.length === 0) return null

        return (
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 mb-2">{title}</h2>
                        <p className="text-sm text-zinc-500">{subTitle}</p>
                    </div>
                    {/* Navigation Buttons */}
                    {items.length > PAGE_SIZE && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={goPrev}
                                disabled={!canPrev}
                                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${!canPrev ? 'border-zinc-100 text-zinc-300 cursor-not-allowed' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'}`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button
                                onClick={goNext}
                                disabled={!canNext}
                                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${!canNext ? 'border-zinc-100 text-zinc-300 cursor-not-allowed' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'}`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleItems.map((item, idx) => {
                        // Check for "create more" placeholder
                        if (item.type === 'create-placeholder') {
                            return <CreateMoreCard key="create-more" onClick={handleCreateClick} />
                        }
                        return (
                            <CompactEventCard
                                key={item.event_id}
                                event={item}
                                onSelect={onSelect}
                                handleImageClick={handleImageClick}
                            />
                        )
                    })}
                </div>

                {/* Page Indicator */}
                {items.length > PAGE_SIZE && (
                    <div className="flex justify-center gap-1.5 mt-4">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === page ? 'w-6 bg-zinc-900' : 'w-1.5 bg-zinc-200'}`}
                            />
                        ))}
                    </div>
                )}
            </section>
        )
    }

    // Prepare organized items mixed with Create card
    const organizedItems = [...organizedEvents]
    // Only add create placeholder if we have events, otherwise we show empty state below
    if (organizedItems.length > 0) {
        organizedItems.push({ type: 'create-placeholder' } as any)
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-12 animate-fadeIn pb-24">
            {/* Header - Only show in 'all' or default mode if you prefer, but typical sidebar layout hides this title */}
            {mode === 'all' && (
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">
                            My Events
                        </h1>
                        <p className="text-zinc-500 font-medium">
                            Manage your organized events.
                        </p>
                    </div>
                    {/* Mobile Create Button */}
                    <button
                        onClick={handleCreateClick}
                        className="md:hidden px-6 py-2.5 bg-zinc-900 text-yellow-400 font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create Event
                    </button>

                    {/* Desktop Create Button */}
                    <button
                        onClick={handleCreateClick}
                        className="hidden md:flex px-6 py-2.5 bg-zinc-900 text-yellow-400 font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create Event
                    </button>
                </div>
            )}

            {/* Joined Events Section - "Upcoming Gigs" */}
            {mode === 'schedule' ? (
                <div className="space-y-6">
                    {/* Sub Tabs */}
                    <div className="flex space-x-4 border-b border-zinc-100">
                        <button
                            onClick={() => setSubTab('upcoming')}
                            className={`pb-3 text-sm font-bold transition-colors border-b-2 ${subTab === 'upcoming' ? 'border-yellow-400 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Upcoming ({upcomingJoinedEvents.length})
                        </button>
                        <button
                            onClick={() => setSubTab('past')}
                            className={`pb-3 text-sm font-bold transition-colors border-b-2 ${subTab === 'past' ? 'border-yellow-400 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Past ({pastJoinedEvents.length})
                        </button>
                    </div>

                    {subTab === 'upcoming' ? (
                        upcomingJoinedEvents.length > 0 ? (
                            <CarouselSection title="" subTitle="" items={upcomingJoinedEvents} />
                        ) : (
                            <div className="bg-zinc-50 rounded-2xl p-12 text-center border border-dashed border-zinc-200">
                                <p className="text-zinc-500 font-medium">No upcoming gigs found.</p>
                                <Link href="/events" className="text-blue-600 font-bold hover:underline mt-2 inline-block">Explore Events</Link>
                            </div>
                        )
                    ) : (
                        pastJoinedEvents.length > 0 ? (
                            <CarouselSection title="" subTitle="" items={pastJoinedEvents} />
                        ) : (
                            <div className="bg-zinc-50 rounded-2xl p-12 text-center border border-dashed border-zinc-200">
                                <p className="text-zinc-500 font-medium">No past gigs found.</p>
                            </div>
                        )
                    )}
                </div>
            ) : (
                // Fallback for mode='all'
                joinedEvents.length > 0 && (
                    <CarouselSection
                        title={mode === 'all' ? "Your Schedule" : ""}
                        subTitle={mode === 'all' ? "Events you are participating in" : ""}
                        items={joinedEvents}
                    />
                )
            )}

            {/* Organized Section */}
            {(mode === 'all' || mode === 'organized') && (
                organizedEvents.length > 0 ? (
                    <CarouselSection
                        title={mode === 'all' ? (joinedEvents.length > 0 ? 'Organized Events' : 'My Events') : ""}
                        subTitle={mode === 'all' ? "Events you created and are managing" : ""}
                        items={organizedItems}
                        isOrganized={true}
                    />
                ) : (
                    <div className="bg-zinc-50 rounded-2xl p-12 text-center border border-dashed border-zinc-200">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <svg className="w-8 h-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 mb-2">No organized events yet</h3>
                        <p className="text-zinc-500 font-medium mb-6 max-w-md mx-auto">Start creating your own events.</p>
                        <button onClick={onCreate} className="px-6 py-3 bg-yellow-400 text-yellow-900 font-bold rounded-xl hover:bg-yellow-500 transition-colors shadow-sm">
                            Create your first event
                        </button>
                    </div>
                )
            )}

            {/* Dashboard Pro Modal */}
            <DashboardProModal
                isOpen={showProModal}
                onClose={() => setShowProModal(false)}
                onSuccess={() => {
                    setShowProModal(false)
                    onProUpgrade()
                }}
            />

            {/* Image Preview Modal */}
            <ImagePreviewModal
                isOpen={!!previewImage}
                imageUrl={previewImage}
                onClose={() => setPreviewImage(null)}
            />
        </div>
    )
}
