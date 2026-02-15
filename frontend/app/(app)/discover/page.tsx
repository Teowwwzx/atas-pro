'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getPublicEvents, getPublicOrganizations, findProfiles, getMyEvents, semanticSearchEvents, semanticSearchProfiles, getMe, getEventsCount, getOrganizationsCount, discoverProfiles, discoverProfilesCount } from '@/services/api'
import { EventDetails, OrganizationResponse, ProfileResponse, EventType, EventRegistrationType, EventRegistrationStatus, MyEventItem } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { SponsorBadge } from '@/components/ui/SponsorBadge'
import { ProfileBadge, IntentType, INTENT_CONFIG } from '@/components/profile/ProfileBadge'
// @ts-ignore
import { debounce } from 'lodash'
import { EventCard } from '@/components/ui/EventCard'

const Pagination = ({ page, total, pageSize = 20, onChange }: { page: number, total: number, pageSize?: number, onChange: (p: number) => void }) => {
    const totalPages = Math.ceil(total / pageSize)
    if (totalPages <= 1) return null
    return (
        <div className="flex justify-center items-center gap-4 mt-8 mb-4">
            <button
                disabled={page === 1}
                onClick={() => onChange(page - 1)}
                className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-zinc-50 transition-colors"
            >
                Previous
            </button>
            <span className="text-sm text-zinc-500">
                Page <span className="font-semibold text-zinc-900">{page}</span> of <span className="font-semibold text-zinc-900">{totalPages}</span>
            </span>
            <button
                disabled={page >= totalPages}
                onClick={() => onChange(page + 1)}
                className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-zinc-50 transition-colors"
            >
                Next
            </button>
        </div>
    )
}


export default function DiscoverPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Initialize tab from URL parameter, default to 'events'
    const tabParam = searchParams.get('tab') as 'events' | 'organizations' | 'people' | null
    const [activeTab, setActiveTab] = useState<'events' | 'organizations' | 'people'>(
        tabParam === 'organizations' || tabParam === 'people' ? tabParam : 'events'
    )

    // Events State
    const [events, setEvents] = useState<EventDetails[]>([])
    const [myEvents, setMyEvents] = useState<MyEventItem[]>([])
    const [eventsLoading, setEventsLoading] = useState(true)
    const [eventSearch, setEventSearch] = useState('')
    const [eventError, setEventError] = useState<string | null>(null)

    // Event Categories State
    const [incomingEvents, setIncomingEvents] = useState<EventDetails[]>([])
    const [fintechEvents, setFintechEvents] = useState<EventDetails[]>([])
    const [aiEvents, setAiEvents] = useState<EventDetails[]>([])
    const [careerEvents, setCareerEvents] = useState<EventDetails[]>([])
    const [blockchainEvents, setBlockchainEvents] = useState<EventDetails[]>([])
    const [friendsEvents, setFriendsEvents] = useState<EventDetails[]>([])
    const [healthEvents, setHealthEvents] = useState<EventDetails[]>([])
    const [artsEvents, setArtsEvents] = useState<EventDetails[]>([])

    // Event Filters State
    const [eventFiltersOpen, setEventFiltersOpen] = useState(false)
    const [filterRegType, setFilterRegType] = useState<EventRegistrationType | ''>('')
    const [filterRegStatus, setFilterRegStatus] = useState<EventRegistrationStatus | ''>('')
    const [filterEventType, setFilterEventType] = useState<EventType | ''>('')
    const [filterTimeframe, setFilterTimeframe] = useState<'upcoming' | 'past' | 'all'>('upcoming')
    const [eventPage, setEventPage] = useState(1)
    const [eventTotal, setEventTotal] = useState(0)

    // Organizations State
    const [orgs, setOrgs] = useState<OrganizationResponse[]>([])
    const [orgsLoading, setOrgsLoading] = useState(true)
    const [orgSearch, setOrgSearch] = useState('')
    const [filterOrgType, setFilterOrgType] = useState('')
    const [orgFiltersOpen, setOrgFiltersOpen] = useState(false)
    const [orgPage, setOrgPage] = useState(1)
    const [orgTotal, setOrgTotal] = useState(0)

    // People State
    const [people, setPeople] = useState<ProfileResponse[]>([])
    const [peopleLoading, setPeopleLoading] = useState(false)
    const [peopleSearch, setPeopleSearch] = useState('')
    const [peopleRole, setPeopleRole] = useState('')
    const [peopleSkill, setPeopleSkill] = useState('')
    const [peopleFiltersOpen, setPeopleFiltersOpen] = useState(false)
    const [peoplePage, setPeoplePage] = useState(1)
    const [peopleTotal, setPeopleTotal] = useState(0)
    const [debouncedPeopleSearch, setDebouncedPeopleSearch] = useState('')
    const [debouncedEventSearch, setDebouncedEventSearch] = useState('')
    const [useAiEvents, setUseAiEvents] = useState(false)
    const [useAiPeople, setUseAiPeople] = useState(false)
    const [currentEmail, setCurrentEmail] = useState<string | null>(null)

    const incomingRef = useRef<HTMLDivElement>(null)


    useEffect(() => {
        loadAllEventSections()
        loadOrgs()
        getMe().then(me => setCurrentEmail(me.email)).catch(() => { })
    }, [])

    // Debounce Search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedEventSearch(eventSearch)
        }, 500)
        return () => clearTimeout(handler)
    }, [eventSearch])

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedPeopleSearch(peopleSearch)
        }, 500)
        return () => clearTimeout(handler)
    }, [peopleSearch])


    // Reset pages when filters change
    useEffect(() => { setEventPage(1) }, [debouncedEventSearch, filterRegType, filterRegStatus, filterEventType, filterTimeframe])
    useEffect(() => { setOrgPage(1) }, [orgSearch, filterOrgType])
    useEffect(() => { setPeoplePage(1) }, [debouncedPeopleSearch, peopleRole, peopleSkill])


    useEffect(() => {
        if (activeTab === 'events') {
            loadFilteredEvents()
        }
    }, [debouncedEventSearch, filterRegType, filterRegStatus, filterEventType, filterTimeframe, activeTab, eventPage])

    useEffect(() => {
        if (activeTab === 'people') {
            loadPeople()
        }
    }, [activeTab, debouncedPeopleSearch, peopleRole, peopleSkill, peoplePage])

    useEffect(() => {
        if (activeTab === 'organizations') {
            loadOrgs()
        }
    }, [activeTab, orgSearch, filterOrgType, orgPage])


    const loadAllEventSections = async () => {
        try {
            setEventsLoading(true)
            const [incoming, fintech, ai, career, blockchain, friends, health, arts, myData] = await Promise.all([
                getPublicEvents({ upcoming: true }),
                getPublicEvents({ category_name: 'Fintech', upcoming: true }),
                getPublicEvents({ category_name: 'AI', upcoming: true }),
                getPublicEvents({ category_name: 'Future Career', upcoming: true }),
                getPublicEvents({ category_name: 'Blockchain', upcoming: true }),
                getPublicEvents({ friends_only: true, upcoming: true }).catch(() => []),
                getPublicEvents({ category_name: 'Health & Wellness', upcoming: true }),
                getPublicEvents({ category_name: 'Arts & Culture', upcoming: true }),
                getMyEvents().catch(() => []) // Silently fail if not logged in
            ])
            setIncomingEvents(incoming)
            setFintechEvents(fintech)
            setAiEvents(ai)
            setCareerEvents(career)
            setBlockchainEvents(blockchain)
            setFriendsEvents(friends)
            setHealthEvents(health)
            setArtsEvents(arts)

            // Filter for events joined (not organized)
            const joinedEvents = myData.filter(e => e.my_role !== 'organizer')
            setMyEvents(joinedEvents)

            // Also load initial "all" events
            loadFilteredEvents()
        } catch (err) {
            console.error('Failed to load event sections', err)
        } finally {
            setEventsLoading(false)
        }
    }

    const loadFilteredEvents = async () => {
        try {
            setEventsLoading(true)
            setEventError(null)

            const params = {
                q_text: debouncedEventSearch,
                registration_type: filterRegType || undefined,
                registration_status: filterRegStatus || undefined,
                type: filterEventType || undefined,
                upcoming: filterTimeframe === 'upcoming' ? true : undefined,
                end_before: filterTimeframe === 'past' ? new Date().toISOString() : undefined,
            }

            if (useAiEvents) {
                const data = await semanticSearchEvents({ q_text: debouncedEventSearch || undefined, top_k: 24 })
                setEvents(data)
                setEventTotal(data.length)
            } else {
                const [data, countRes] = await Promise.all([
                    // @ts-ignore
                    getPublicEvents({ ...params, page: eventPage }),
                    getEventsCount(params)
                ])
                setEvents(data)
                setEventTotal(countRes.total_count)
            }
        } catch (err) {
            console.error('Failed to load events', err)
            setEventError('Failed to load events')
        } finally {
            setEventsLoading(false)
        }
    }

    const loadOrgs = async () => {
        try {
            setOrgsLoading(true)
            const params = {
                q: orgSearch,
                type: filterOrgType || undefined
            }
            const [data, countRes] = await Promise.all([
                getPublicOrganizations({ ...params, page: orgPage }),
                getOrganizationsCount(params)
            ])
            setOrgs(data)
            setOrgTotal(countRes.total_count)
        } catch (err: any) {
            console.error(err)
            toast.error(err?.response?.data?.detail || 'Failed to load organizations')
        } finally {
            setOrgsLoading(false)
        }
    }

    const loadPeople = async () => {
        try {
            setPeopleLoading(true)
            const params = {
                name: debouncedPeopleSearch || undefined,
                role: peopleRole || undefined,
                skill: peopleSkill || undefined,
            }

            const [profiles, countRes] = await Promise.all([
                discoverProfiles({ ...params, page: peoplePage }),
                discoverProfilesCount(params)
            ])

            setPeople(profiles)
            setPeopleTotal(countRes.total_count)
        } catch (err) {
            console.error(err)
        } finally {
            setPeopleLoading(false)
        }
    }

    const filteredOrgs = orgs

    // Function to change tab and update URL
    const handleTabChange = (tab: 'events' | 'organizations' | 'people') => {
        setActiveTab(tab)
        router.push(`/discover?tab=${tab}`, { scroll: false })
    }

    return (
        <div className="min-h-screen">
            {/* Top Bar: Tabs + Search/Filter */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Tabs (Left) */}
                    <div className="flex gap-1 bg-zinc-100/50 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => handleTabChange('events')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'events' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
                        >
                            Events
                        </button>
                        <button
                            onClick={() => handleTabChange('organizations')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'organizations' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
                        >
                            Organizations
                        </button>
                        <button
                            onClick={() => handleTabChange('people')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'people' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
                        >
                            People
                        </button>
                    </div>

                    {/* Controls (Right) - FLEX LAYOUT */}
                    <div className="flex items-center gap-3 flex-1 md:flex-none md:min-w-[400px]">
                        {/* Search Input */}
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-zinc-400 group-focus-within:text-yellow-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-4 py-2.5 bg-zinc-50 border-transparent rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white transition-all duration-200 text-sm font-medium"
                                placeholder={
                                    activeTab === 'events' ? "Search events..." :
                                        activeTab === 'organizations' ? "Search organizations..." :
                                            "Search people..."
                                }
                                value={
                                    activeTab === 'events' ? eventSearch :
                                        activeTab === 'organizations' ? orgSearch :
                                            peopleSearch
                                }
                                onChange={(e) => {
                                    if (activeTab === 'events') setEventSearch(e.target.value)
                                    else if (activeTab === 'organizations') setOrgSearch(e.target.value)
                                    else setPeopleSearch(e.target.value)
                                }}
                            />
                        </div>

                        {/* Filters Button & Dropdown - RELATIVE */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    if (activeTab === 'events') setEventFiltersOpen(!eventFiltersOpen)
                                    else if (activeTab === 'organizations') setOrgFiltersOpen(!orgFiltersOpen)
                                    else setPeopleFiltersOpen(!peopleFiltersOpen)
                                }}
                                className={`p-2.5 rounded-xl font-bold transition-all duration-200 flex items-center gap-2 text-sm border ${(activeTab === 'events' && eventFiltersOpen) || (activeTab === 'organizations' && orgFiltersOpen) || (activeTab === 'people' && peopleFiltersOpen)
                                    ? 'border-yellow-200 text-yellow-600 bg-yellow-50 shadow-sm ring-1 ring-yellow-100'
                                    : 'border-transparent bg-zinc-50 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                            </button>

                            {/* Dropdown Menu */}
                            {((activeTab === 'events' && eventFiltersOpen) || (activeTab === 'organizations' && orgFiltersOpen) || (activeTab === 'people' && peopleFiltersOpen)) && (
                                <>
                                    {/* Backdrop to close */}
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => {
                                            if (activeTab === 'events') setEventFiltersOpen(false)
                                            else if (activeTab === 'organizations') setOrgFiltersOpen(false)
                                            else setPeopleFiltersOpen(false)
                                        }}
                                    />

                                    {/* Dropdown Content */}
                                    <div className="absolute right-0 top-full mt-4 w-72 bg-white rounded-2xl shadow-xl border border-zinc-100 p-5 z-50 animate-fadeIn origin-top-right">
                                        {activeTab === 'events' ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-400 uppercase mb-1.5 block">Timeframe</label>
                                                    <select
                                                        value={filterTimeframe}
                                                        onChange={(e) => setFilterTimeframe(e.target.value as any)}
                                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 outline-none"
                                                    >
                                                        <option value="upcoming">Upcoming Events</option>
                                                        <option value="past">Past Events</option>
                                                        <option value="all">All Events</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-400 uppercase mb-1.5 block">Status</label>
                                                    <select
                                                        value={filterRegStatus}
                                                        onChange={(e) => setFilterRegStatus(e.target.value as EventRegistrationStatus)}
                                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 outline-none"
                                                    >
                                                        <option value="">All Status</option>
                                                        <option value="opened">Open</option>
                                                        <option value="closed">Closed</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-400 uppercase mb-1.5 block">Cost</label>
                                                    <select
                                                        value={filterRegType}
                                                        onChange={(e) => setFilterRegType(e.target.value as EventRegistrationType)}
                                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 outline-none"
                                                    >
                                                        <option value="">Any Cost</option>
                                                        <option value="free">Free</option>
                                                        <option value="paid">Paid</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-400 uppercase mb-1.5 block">Venue</label>
                                                    <select
                                                        value={filterEventType}
                                                        onChange={(e) => setFilterEventType(e.target.value as EventType)}
                                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 outline-none"
                                                    >
                                                        <option value="">All Types</option>
                                                        <option value="online">Online</option>
                                                        <option value="physical">Physical</option>
                                                        <option value="hybrid">Hybrid</option>
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => { setFilterRegStatus(''); setFilterRegType(''); setFilterEventType('') }}
                                                    className="w-full text-center text-xs font-bold text-zinc-400 hover:text-zinc-900 py-1"
                                                >
                                                    Reset Filters
                                                </button>
                                            </div>
                                        ) : activeTab === 'organizations' ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-400 uppercase mb-1.5 block">Org Type</label>
                                                    <select
                                                        value={filterOrgType}
                                                        onChange={(e) => setFilterOrgType(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 outline-none"
                                                    >
                                                        <option value="">All Types</option>
                                                        <option value="company">Company</option>
                                                        <option value="university">University</option>
                                                        <option value="community">Community</option>
                                                        <option value="nonprofit">Nonprofit</option>
                                                        <option value="government">Government</option>
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => { setFilterOrgType('') }}
                                                    className="w-full text-center text-xs font-bold text-zinc-400 hover:text-zinc-900 py-1"
                                                >
                                                    Reset Filters
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div>
                                                    <select
                                                        value={peopleRole}
                                                        onChange={(e) => setPeopleRole(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 outline-none"
                                                    >
                                                        <option value="">All Members</option>
                                                        <option value="expert">Expert</option>
                                                        <option value="sponsor">Sponsor</option>
                                                        <option value="student">Student</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-400 uppercase mb-1.5 block">Skill</label>
                                                    <input
                                                        type="text"
                                                        value={peopleSkill}
                                                        onChange={(e) => setPeopleSkill(e.target.value)}
                                                        placeholder="e.g. Python"
                                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 outline-none"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => { setPeopleRole(''); setPeopleSkill('') }}
                                                    className="w-full text-center text-xs font-bold text-zinc-400 hover:text-zinc-900 py-1"
                                                >
                                                    Reset Filters
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                </>
                            )}
                        </div>

                        {/* AI Match Toggle - REMOVED */}
                    </div>
                </div>
            </div>

            {activeTab === 'events' && (
                <div className="animate-fadeIn space-y-12">
                    {/* Only show categories if NOT searching/filtering */}
                    {!eventSearch && !filterRegStatus && !filterRegType && !filterEventType && filterTimeframe !== 'past' && (
                        <>


                            {/* Incoming Events Carousel */}
                            {incomingEvents.length > 0 && (
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-black text-zinc-900">Incoming Events</h2>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setEventSearch('upcoming')
                                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                                }}
                                                className="text-sm font-bold text-yellow-600 hover:text-yellow-700 mr-4"
                                            >
                                                See More
                                            </button>

                                            <button
                                                onClick={() => {
                                                    incomingRef.current?.scrollBy({ left: -320, behavior: 'smooth' })
                                                }}
                                                className="w-10 h-10 rounded-full bg-white border border-zinc-100 flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-200 transition-colors shadow-sm"
                                            >
                                                <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    incomingRef.current?.scrollBy({ left: 320, behavior: 'smooth' })
                                                }}
                                                className="w-10 h-10 rounded-full bg-white border border-zinc-100 flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-200 transition-colors shadow-sm"
                                            >
                                                <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        ref={incomingRef}
                                        className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
                                    >
                                        {incomingEvents.map((event) => (
                                            <div key={event.id} className="snap-center shrink-0 w-[65vw] sm:w-[320px]">
                                                <EventCard event={event} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Categories */}
                            {[
                                { title: 'Your Friend Events', data: friendsEvents },
                                { title: 'IT in Fintech', data: fintechEvents },
                                { title: 'AI', data: aiEvents },
                                { title: 'Future Career', data: careerEvents },
                                { title: 'Blockchain', data: blockchainEvents },
                                { title: 'Health & Wellness', data: healthEvents },
                                { title: 'Arts & Culture', data: artsEvents }
                            ].map((cat) => cat.data.length > 0 && (
                                <div key={cat.title}>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-black text-zinc-900">{cat.title}</h2>
                                        <button
                                            onClick={() => {
                                                setEventSearch(cat.title)
                                                window.scrollTo({ top: 0, behavior: 'smooth' })
                                            }}
                                            className="text-sm font-bold text-yellow-600 hover:text-yellow-700"
                                        >
                                            See More
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                        {cat.data.slice(0, 4).map((event) => (
                                            <EventCard key={event.id} event={event} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* All Events Grid */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-zinc-900">
                                {useAiEvents ? 'AI Match Results' : (eventSearch || filterRegStatus || filterRegType || filterEventType ? 'Search Results' : 'All Events')}
                            </h2>
                            {useAiEvents && (
                                <span className="text-xs text-zinc-500">{currentEmail ? `You (${currentEmail}) searched: ${debouncedEventSearch || '—'}` : `You searched: ${debouncedEventSearch || '—'}`}</span>
                            )}
                        </div>

                        {eventsLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                            </div>
                        ) : events.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-yellow-100">
                                <div className="mx-auto h-24 w-24 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                                    <svg className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <p className="text-zinc-900 text-xl font-bold">No events found matching your search.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                                {events.map((event) => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        )}

                        {!useAiEvents && (
                            <Pagination page={eventPage} total={eventTotal} onChange={setEventPage} />
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'organizations' && (
                <div className="animate-fadeIn">
                    {orgsLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                        </div>
                    ) : filteredOrgs.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-yellow-100">
                            <div className="mx-auto h-24 w-24 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                                <svg className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <p className="text-zinc-900 text-xl font-bold">No organizations found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {filteredOrgs.map((org) => (
                                <Link key={org.id} href={`/organizations/${org.id}`} className="block group">
                                    <div className="bg-white overflow-hidden shadow-sm rounded-2xl md:rounded-[2rem] hover:shadow-xl transition-all duration-300 border border-zinc-100 group-hover:-translate-y-1">
                                        <div className="h-2 md:h-3 bg-yellow-400"></div>
                                        <div className="px-4 py-4 md:px-6 md:py-6">
                                            <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-3 mb-2 md:mb-4 text-center md:text-left">
                                                {org.logo_url ? (
                                                    <img src={org.logo_url} alt="logo" className="h-10 w-10 md:h-10 md:w-10 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="h-10 w-10 md:h-10 md:w-10 rounded-lg bg-zinc-100 flex items-center justify-center font-bold text-zinc-400 shrink-0">
                                                        {org.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <h3 className="text-sm md:text-lg font-black text-zinc-900 truncate group-hover:text-yellow-600 transition-colors line-clamp-1">{org.name}</h3>
                                                    {org.type && <span className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-wider">{org.type}</span>}
                                                </div>
                                            </div>
                                            {org.description && (
                                                <p className="hidden md:block text-sm text-zinc-700 line-clamp-3">{org.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                    <Pagination page={orgPage} total={orgTotal} onChange={setOrgPage} />

                </div>
            )}

            {activeTab === 'people' && (
                <div className="animate-fadeIn">
                    {useAiPeople && (
                        <div className="mb-4 text-xs text-zinc-500">{currentEmail ? `You (${currentEmail}) searched: ${debouncedPeopleSearch || '—'}` : `You searched: ${debouncedPeopleSearch || '—'}`}</div>
                    )}

                    {peopleLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                        </div>
                    ) : people.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-yellow-100">
                            <div className="mx-auto h-24 w-24 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                                <svg className="h-10 w-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <p className="text-zinc-900 text-xl font-bold">No people found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {people.map((profile) => (
                                <Link key={profile.id} href={`/profile/${profile.user_id}`} className="block group">
                                    <div className={`bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 border ${profile.sponsor_tier === 'Gold' ? 'border-yellow-200 ring-1 ring-yellow-100' : 'border-zinc-100'} group-hover:-translate-y-1 h-full flex flex-col overflow-hidden`}>
                                        <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 mb-2 md:mb-4 text-center md:text-left">
                                            {/* Avatar Wrapper with Badge Support */}
                                            <div className="relative">
                                                {profile.avatar_url ? (
                                                    <img
                                                        src={profile.avatar_url}
                                                        alt=""
                                                        className={`w-12 h-12 md:w-16 md:h-16 rounded-full object-cover ring-2 md:ring-4 ${profile.sponsor_tier === 'Gold' ? 'ring-yellow-400' :
                                                            profile.sponsor_tier === 'Silver' ? 'ring-slate-300' :
                                                                profile.sponsor_tier === 'Bronze' ? 'ring-amber-700' :
                                                                    'ring-yellow-50 group-hover:ring-yellow-100'
                                                            } transition-all`}
                                                    />
                                                ) : (
                                                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-black text-lg md:text-xl ring-2 md:ring-4 ${profile.sponsor_tier === 'Gold' ? 'ring-yellow-400' :
                                                        profile.sponsor_tier === 'Silver' ? 'ring-slate-300' :
                                                            profile.sponsor_tier === 'Bronze' ? 'ring-amber-700' :
                                                                'ring-yellow-50 group-hover:ring-yellow-100'
                                                        } transition-all shrink-0`}>
                                                        {profile.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                )}


                                            </div>

                                            <div className="min-w-0 flex-1 w-full">
                                                <div className="flex items-center gap-1.5 justify-center md:justify-start">
                                                    <h3 className="text-sm md:text-lg font-black text-zinc-900 truncate group-hover:text-yellow-600 transition-colors">{profile.full_name}</h3>
                                                    {profile.sponsor_tier && (
                                                        <div className="shrink-0 transform hover:scale-110 transition-transform">
                                                            <SponsorBadge tier={profile.sponsor_tier} size="sm" />
                                                        </div>
                                                    )}
                                                </div>
                                                {profile.title && (
                                                    <p className="text-xs md:text-sm font-bold text-zinc-500 truncate">{profile.title}</p>
                                                )}
                                                {/* Rating */}
                                                {(profile.average_rating !== undefined && profile.average_rating > 0) && (
                                                    <div className="flex items-center justify-center md:justify-start gap-1 mt-1">
                                                        <svg className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                        <span className="text-[10px] md:text-xs font-bold text-zinc-900">{profile.average_rating.toFixed(1)}</span>
                                                        {profile.reviews_count ? (
                                                            <span className="text-[10px] md:text-xs text-zinc-400">({profile.reviews_count})</span>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tags - Hidden on small mobile to save space, visible on MD */}
                                        {profile.tags && profile.tags.length > 0 && (
                                            <div className="hidden md:flex flex-wrap gap-2 mb-4">
                                                {profile.tags.slice(0, 3).map(tag => (
                                                    <span key={tag.id} className="px-2.5 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full font-bold border border-yellow-100">
                                                        {tag.name}
                                                    </span>
                                                ))}
                                                {profile.tags.length > 3 && (
                                                    <span className="px-2 py-1 bg-zinc-50 text-zinc-400 text-xs rounded-full font-medium">+{profile.tags.length - 3}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Availability - REMOVED INTENT AS IT IS BADGE NOW */}
                                        {profile.availability && (
                                            <div className="mb-0 md:mb-3 pt-2 md:pt-3 border-t border-zinc-100 mt-2 md:mt-auto">
                                                <div className="flex items-center gap-2 text-[10px] md:text-xs text-zinc-500 mb-1 justify-center md:justify-start">
                                                    <svg className="w-3 h-3 md:w-4 md:h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="truncate">{profile.availability}</span>
                                                </div>
                                            </div>
                                        )}

                                        {profile.bio && (
                                            <p className="hidden md:block text-sm text-zinc-400 line-clamp-2 mb-3">{profile.bio}</p>
                                        )}

                                        {/* Featured Intent Bar - Full Width Bottom Footer */}
                                        {profile.intents && profile.intents.length > 0 && (
                                            <div className={`mt-auto -mx-4 -mb-4 md:-mx-6 md:-mb-6 px-4 py-2 md:px-6 md:py-2.5 flex items-center justify-center gap-2 ${INTENT_CONFIG[profile.intents[0] as IntentType]?.bgColor || 'bg-gray-100'}`}>
                                                <div className={`${INTENT_CONFIG[profile.intents[0] as IntentType]?.color || 'text-gray-600'}`}>
                                                    {INTENT_CONFIG[profile.intents[0] as IntentType]?.icon}
                                                </div>
                                                <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest truncate ${INTENT_CONFIG[profile.intents[0] as IntentType]?.color || 'text-gray-600'}`}>
                                                    {INTENT_CONFIG[profile.intents[0] as IntentType]?.label}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                    <Pagination page={peoplePage} total={peopleTotal} onChange={setPeoplePage} />

                </div>
            )}
        </div>
    )
}
