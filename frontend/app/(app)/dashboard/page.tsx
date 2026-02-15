'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { getMyEvents, getMyProfile, getMe, getMyChecklistItems, getMyRequests } from '@/services/api'
import { ProfileResponse, UserMeResponse, EventInvitationResponse, MyEventItem } from '@/services/api.types'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from 'react-hot-toast'
import { DashboardEventList } from './DashboardEventList'
import { DashboardTabOrganized } from './DashboardTabOrganized'
import { DashboardInvitationList } from './DashboardInvitationList'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'

function DashboardPageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // We can still support ?eventId=... but now it redirects
    const urlEventId = searchParams.get('eventId')

    const [loading, setLoading] = useState(true)
    const [events, setEvents] = useState<MyEventItem[]>([])
    const [requests, setRequests] = useState<EventInvitationResponse[]>([])
    const [view, setView] = useState<'list'>('list') // Only list view now
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
    const [layoutView, setLayoutView] = useState<'grid' | 'list'>('grid')

    // Global State
    const [user, setUser] = useState<ProfileResponse | null>(null)
    const [me, setMe] = useState<UserMeResponse | null>(null)
    const [openChecklistCount, setOpenChecklistCount] = useState(0)

    const [activeTab, setActiveTab] = useState<'overview' | 'invitations' | 'schedule' | 'organized'>('overview')

    useEffect(() => {
        fetchData()
    }, [])

    // New Redirect Logic for legacy ?eventId support or auto-selection
    useEffect(() => {
        if (events.length > 0 && urlEventId) {
            const evt = events.find(e => e.event_id === urlEventId)
            if (evt) {
                handleEventSelect(evt)
            }
        }
    }, [urlEventId, events])


    const fetchData = async () => {
        try {
            // We use allSettled-like pattern by catching individual promises so one failure doesn't break the whole dashboard
            const [eventsData, profileData, meData, checklistItems, requestsData] = await Promise.all([
                getMyEvents().catch(e => {
                    console.error('Failed to fetch events:', e)
                    return []
                }),
                getMyProfile().catch(e => {
                    console.error('Failed to fetch profile:', e)
                    return null
                }),
                getMe().catch(() => null),
                getMyChecklistItems(true).catch(() => []),
                getMyRequests().catch(() => [])
            ])

            setEvents(eventsData)
            setUser(profileData)
            setRequests(requestsData)
            setMe(meData)
            setOpenChecklistCount((checklistItems || []).length)

        } catch (error) {
            console.error('Dashboard fatal load error:', error)
            toast.error('Failed to load dashboard')
        } finally {
            setLoading(false)
        }
    }

    // Navigation Handler
    const handleEventSelect = (event: MyEventItem) => {
        const staffRoles = ['organizer', 'committee']
        if (event.my_role && staffRoles.includes(event.my_role)) {
            router.push(`/manage/${event.event_id}`)
        } else {
            router.push(`/events/${event.event_id}`)
        }
    }

    // Calculations
    const upcomingBookings = events
        .filter(e =>
            e.my_role && !['organizer', 'committee'].includes(e.my_role) &&
            (e.my_status === 'accepted' || e.my_status === 'attended') &&
            new Date(e.end_datetime) > new Date()
        )
        .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())

    const organizedCount = events.filter(e => e.my_role && ['organizer', 'committee'].includes(e.my_role) && e.my_status === 'accepted').length
    // Note: Removed "end date > now" filter for count to show ALL organized events count? 
    // Or keep consistent? Old code: events.filter(e => e.my_role === 'organizer' && new Date(e.end_datetime) > new Date()).length
    // But organized tab shows all. Let's show TOTAL organized count in sidebar badge.

    const scheduleCount = upcomingBookings.length


    if (loading && events.length === 0) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
                <Skeleton height="400px" className="rounded-[2.5rem]" />
            </div>
        )
    }

    return (
        <div className="w-full max-w-[95%] 2xl:max-w-screen-2xl mx-auto px-4 py-8 animate-fadeIn">
            <div className="flex flex-col lg:flex-row gap-10">

                {/* SIDEBAR NAVIGATION - Collapsible */}
                <aside className={`${isSidebarExpanded ? 'w-full lg:w-64' : 'w-full lg:w-20'} flex-shrink-0 lg:sticky lg:top-24 h-fit space-y-4 flex flex-col transition-all duration-300 bg-white lg:bg-transparent rounded-2xl lg:rounded-none shadow-sm lg:shadow-none mb-6 lg:mb-0 pb-4 lg:pb-0 border lg:border-none border-zinc-100`}>
                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                        className="hidden lg:flex w-full items-center justify-center p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                        title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                        {isSidebarExpanded ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                        )}
                    </button>

                    <nav className="space-y-2 w-full flex flex-row lg:flex-col justify-evenly lg:justify-start overflow-x-auto lg:overflow-visible px-2 lg:px-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                        <button
                            onClick={() => { setActiveTab('overview'); }}
                            title="Overview"
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === 'overview'
                                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'} ${!isSidebarExpanded && 'justify-center'}`}
                        >
                            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            <span className={`font-bold truncate animate-fadeIn ${isSidebarExpanded ? 'block' : 'block lg:hidden'}`}>Overview</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('invitations'); }}
                            title="Invitations"
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${activeTab === 'invitations'
                                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'} ${!isSidebarExpanded && 'justify-center'}`}
                        >
                            <div className="relative">
                                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                {!isSidebarExpanded && requests.length > 0 && (
                                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                                        {requests.length}
                                    </span>
                                )}
                            </div>
                            <span className={`font-bold truncate animate-fadeIn ${isSidebarExpanded ? 'block' : 'block lg:hidden'}`}>Invitations</span>
                            {isSidebarExpanded && requests.length > 0 && (
                                <span className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                    {requests.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab('schedule'); }}
                            title="My Schedule"
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${activeTab === 'schedule'
                                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'} ${!isSidebarExpanded && 'justify-center'}`}
                        >
                            <div className="relative">
                                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {!isSidebarExpanded && scheduleCount > 0 && (
                                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                                        {scheduleCount}
                                    </span>
                                )}
                            </div>
                            <span className={`font-bold truncate animate-fadeIn ${isSidebarExpanded ? 'block' : 'block lg:hidden'}`}>My Schedule</span>
                            {isSidebarExpanded && scheduleCount > 0 && (
                                <span className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                    {scheduleCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab('organized'); }}
                            title="Organized Events"
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${activeTab === 'organized'
                                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'} ${!isSidebarExpanded && 'justify-center'}`}
                        >
                            <div className="relative">
                                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                {!isSidebarExpanded && organizedCount > 0 && (
                                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                                        {organizedCount}
                                    </span>
                                )}
                            </div>
                            <span className={`font-bold truncate animate-fadeIn ${isSidebarExpanded ? 'block' : 'block lg:hidden'}`}>Organized Events</span>
                            {isSidebarExpanded && organizedCount > 0 && (
                                <span className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                    {organizedCount}
                                </span>
                            )}
                        </button>
                    </nav>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 min-w-0">
                    {activeTab === 'overview' && (
                        <div className="space-y-10 animate-slideUp">
                            {/* Stats Cards - Flexible Row (No Gaps) */}
                            <div className="flex flex-col md:flex-row gap-4 w-full">
                                <div onClick={() => setActiveTab('invitations')} className="flex-1 min-w-0 bg-white p-4 md:p-6 rounded-2xl border border-zinc-100 border-l-4 border-l-yellow-400 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group flex items-center justify-between relative overflow-hidden">
                                    <div className="relative z-10 shrink-0">
                                        <div className="text-yellow-600 font-bold uppercase text-xs tracking-wider mb-1">Pending Inivites</div>
                                        <div className="text-3xl md:text-4xl font-black text-zinc-900">{requests.length}</div>
                                        <div className="text-sm font-medium text-zinc-500 mt-1 group-hover:text-zinc-900 transition-colors">Action Required</div>
                                    </div>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                        <svg className="w-16 h-16 md:w-24 md:h-24 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                                    </div>
                                </div>

                                <div onClick={() => setActiveTab('schedule')} className="flex-1 min-w-0 bg-white p-4 md:p-6 rounded-2xl border border-zinc-100 border-l-4 border-l-blue-500 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group flex items-center justify-between relative overflow-hidden">
                                    <div className="relative z-10 shrink-0">
                                        <div className="text-blue-600 font-bold uppercase text-xs tracking-wider mb-1">Upcoming Gigs</div>
                                        <div className="text-3xl md:text-4xl font-black text-zinc-900">{upcomingBookings.length}</div>
                                        <div className="text-sm font-medium text-zinc-500 mt-1 group-hover:text-zinc-900 transition-colors">Confirmed</div>
                                    </div>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                        <svg className="w-16 h-16 md:w-24 md:h-24 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>

                                <div onClick={() => setActiveTab('organized')} className="flex-1 min-w-0 bg-white p-4 md:p-6 rounded-2xl border border-zinc-100 border-l-4 border-l-purple-500 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group flex items-center justify-between relative overflow-hidden">
                                    <div className="relative z-10 shrink-0">
                                        <div className="text-purple-600 font-bold uppercase text-xs tracking-wider mb-1">Organized</div>
                                        <div className="text-3xl md:text-4xl font-black text-zinc-900">{organizedCount}</div>
                                        <div className="text-sm font-medium text-zinc-500 mt-1 group-hover:text-zinc-900 transition-colors">My Events</div>
                                    </div>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                        <svg className="w-16 h-16 md:w-24 md:h-24 text-purple-500" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Simple View Toggle */}
                            <div className="flex justify-end">
                                <div className="bg-zinc-100 p-1 rounded-xl flex gap-1">
                                    <button onClick={() => setLayoutView('grid')} className={`p-2 rounded-lg transition-all ${layoutView === 'grid' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`} title="Grid View">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                    </button>
                                    <button onClick={() => setLayoutView('list')} className={`p-2 rounded-lg transition-all ${layoutView === 'list' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`} title="List View">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Section: Pending Invites (if any) */}
                            {requests.length > 0 && (
                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-zinc-900">Pending Invitations</h3>
                                        <button onClick={() => setActiveTab('invitations')} className="text-sm font-bold text-zinc-400 hover:text-zinc-900">See all</button>
                                    </div>
                                    <DashboardInvitationList
                                        requests={requests.slice(0, 4)}
                                        layoutMode={layoutView}
                                        showTabs={false}
                                    />
                                </section>
                            )}

                            {/* Section: Schedule */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-zinc-900">Your Schedule</h3>
                                    <button onClick={() => setActiveTab('schedule')} className="text-sm font-bold text-zinc-400 hover:text-zinc-900">See all</button>
                                </div>
                                {upcomingBookings.length > 0 ? (
                                    <div className={`${layoutView === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}`}>
                                        {upcomingBookings.slice(0, layoutView === 'grid' ? 4 : 3).map((evt) => {
                                            const eventDate = new Date(evt.start_datetime)
                                            const daysRemaining = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                            // Determine colors
                                            const typeColor = evt.type === 'online' ? 'bg-blue-100 text-blue-700' :
                                                evt.type === 'physical' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-purple-100 text-purple-700'

                                            return (
                                                <div
                                                    key={evt.event_id}
                                                    onClick={() => handleEventSelect(evt)} // Use Navigation Handler
                                                    className={`bg-white p-4 rounded-2xl border border-zinc-100 hover:border-zinc-300 hover:shadow-lg transition-all cursor-pointer flex gap-4 group ${layoutView === 'grid' ? 'flex-col sm:flex-row' : 'flex-row'}`}
                                                >
                                                    {/* Image or Date Box */}
                                                    {evt.cover_url ? (
                                                        <div className="w-16 h-16 rounded-xl bg-zinc-100 flex-shrink-0 overflow-hidden relative">
                                                            <ImageWithFallback
                                                                src={evt.cover_url}
                                                                fallbackSrc={`https://placehold.co/64x64/png?text=${encodeURIComponent(evt.title.substring(0, 2))}`}
                                                                alt=""
                                                                className="object-cover group-hover:scale-110 transition-transform"
                                                                fill
                                                                sizes="64px"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-16 h-16 bg-blue-50 rounded-xl flex flex-col items-center justify-center text-blue-900 flex-shrink-0 group-hover:bg-blue-100">
                                                            <span className="text-xs font-bold uppercase">{eventDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                                                            <span className="text-2xl font-black">{eventDate.getDate()}</span>
                                                        </div>
                                                    )}

                                                    <div className="overflow-hidden flex-1">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md ${evt.my_role === 'organizer' ? 'bg-purple-100 text-purple-700' :
                                                                evt.my_role === 'committee' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-green-100 text-green-700'
                                                                }`}>
                                                                {evt.my_role}
                                                            </span>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${typeColor}`}>
                                                                {evt.type}
                                                            </span>
                                                            {daysRemaining > 0 && daysRemaining <= 30 && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                                                                    {daysRemaining} days left
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="font-bold text-zinc-900 truncate group-hover:text-blue-600 transition-colors">{evt.title}</h4>
                                                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            {eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-zinc-50 rounded-2xl p-8 border border-dashed border-zinc-200 text-center">
                                        <p className="text-zinc-400 font-medium">No upcoming events.</p>
                                        <button onClick={() => router.push('/discover')} className="text-sm font-bold text-zinc-900 mt-2 hover:underline">Browse Events</button>
                                    </div>
                                )}
                            </section>

                            {/* Section: Organized */}
                            {organizedCount > 0 && (
                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-zinc-900">Recently Organized</h3>
                                        <button onClick={() => setActiveTab('organized')} className="text-sm font-bold text-zinc-400 hover:text-zinc-900">View all</button>
                                    </div>
                                    <div className={`${layoutView === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}`}>
                                        {events.filter(e => e.my_role && ['organizer', 'committee'].includes(e.my_role) && e.my_status === 'accepted' && new Date(e.end_datetime) > new Date()).slice(0, 4).map((evt) => {
                                            const eventDate = new Date(evt.start_datetime)
                                            const daysRemaining = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                            // Determine colors
                                            const typeColor = evt.type === 'online' ? 'bg-blue-100 text-blue-700' :
                                                evt.type === 'physical' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-purple-100 text-purple-700'

                                            return (
                                                <div
                                                    key={evt.event_id}
                                                    onClick={() => handleEventSelect(evt)} // Use Navigation Handler
                                                    className={`bg-white p-4 rounded-2xl border border-zinc-100 hover:border-yellow-400 hover:shadow-lg transition-all cursor-pointer flex gap-4 group ${layoutView === 'grid' ? 'flex-col sm:flex-row' : 'flex-row'}`}
                                                >
                                                    {/* Image or Icon Box */}
                                                    {evt.cover_url ? (
                                                        <div className="w-16 h-16 rounded-xl bg-zinc-100 flex-shrink-0 overflow-hidden">
                                                            <img src={evt.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-16 h-16 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600 flex-shrink-0 group-hover:bg-yellow-100">
                                                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                        </div>
                                                    )}

                                                    <div className="overflow-hidden flex-1">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md ${evt.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                                                                evt.status === 'draft' ? 'bg-zinc-100 text-zinc-700' :
                                                                    'bg-red-100 text-red-700'
                                                                }`}>
                                                                {evt.status}
                                                            </span>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${typeColor}`}>
                                                                {evt.type}
                                                            </span>
                                                            {daysRemaining > 0 && daysRemaining <= 30 && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                                                                    {daysRemaining} days left
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="font-bold text-zinc-900 truncate group-hover:text-yellow-600 transition-colors">{evt.title}</h4>
                                                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                            {evt.participant_count || 0} participants
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                    {activeTab === 'invitations' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                                <h2 className="text-3xl font-black text-zinc-900">Invitations</h2>
                            </div>
                            <DashboardInvitationList
                                requests={requests}
                                layoutMode={layoutView}
                            />
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <h2 className="text-3xl font-black text-zinc-900">My Schedule</h2>
                            </div>
                            <DashboardEventList
                                events={events}
                                user={user}
                                me={me}
                                onSelect={handleEventSelect} // Use Navigation Handler
                                onCreate={() => router.push('/events/create')}
                                onProUpgrade={fetchData}
                                mode="schedule"
                            />
                        </div>
                    )}

                    {activeTab === 'organized' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                                <h2 className="text-3xl font-black text-zinc-900">Organized Events</h2>
                            </div>
                            <DashboardTabOrganized
                                events={events.filter(e => e.my_role && ['organizer', 'committee'].includes(e.my_role) && e.my_status === 'accepted')}
                                user={user}
                                me={me}
                                onSelect={handleEventSelect} // Use Navigation Handler
                                onCreate={() => router.push('/events/create')}
                                onProUpgrade={fetchData}
                            />
                        </div>
                    )}
                </main>
            </div>
        </div >
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-12"><Skeleton height="400px" className="rounded-[2.5rem]" /></div>}>
            <DashboardPageInner />
        </Suspense>
    )
}
