"use client"
import '@/app/(public)/experts/experts.css' // Recycle expert styles for consistency
import React, { useEffect, useState, Suspense } from 'react'
import { PublicNavbar } from '@/components/ui/PublicNavbar'
import Link from 'next/link'
import { getPublicEvents, listCategories } from '@/services/api'
import { EventType, EventDetails, CategoryResponse } from '@/services/api.types'
import { format } from 'date-fns'

function EventsContent() {
    const [events, setEvents] = useState<EventDetails[]>([])
    const [categories, setCategories] = useState<CategoryResponse[]>([])
    const [loading, setLoading] = useState(true)

    // Filter States
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [selectedType, setSelectedType] = useState<string>('')
    const [showFilters, setShowFilters] = useState(false)

    // Fetch Categories on Mount
    useEffect(() => {
        listCategories().then(setCategories).catch(console.error)
    }, [])

    // Fetch Events when filters change
    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true)
            try {
                const params: any = {
                    upcoming: true, // Default to upcoming?
                    q_text: searchTerm || undefined,
                    category_name: selectedCategory || undefined,
                    type: selectedType ? (selectedType as EventType) : undefined,
                }
                const data = await getPublicEvents(params)
                setEvents(data)
            } catch (error) {
                console.error("Failed to load events", error)
            } finally {
                setLoading(false)
            }
        }

        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchEvents()
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [searchTerm, selectedCategory, selectedType])

    return (
        <div className="experts-page-wrapper">
            <div className="noise"></div>

            <PublicNavbar />

            {/* HERO */}
            <header className="expert-hero" style={{ minHeight: '60vh', paddingBottom: '2rem' }}>
                <div className="hero-badge" style={{ borderColor: '#60a5fa', color: '#60a5fa', boxShadow: '0 0 30px rgba(96, 165, 250, 0.4)' }}>
                    <i className="fas fa-calendar-alt"></i> Discover Experiences
                </div>
                <h1 className="hero-title font-display">
                    Campus Events <br /> <span style={{ color: '#60a5fa' }}>Reimagined.</span>
                </h1>
                <p className="hero-desc">
                    Find hackathons, workshops, and networking sessions across 500+ universities.
                </p>

                <div className="search-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search events (e.g. 'Hackathon', 'Design')..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 ${showFilters ? 'bg-white/10' : ''}`}
                        title="Advanced Filters"
                    >
                        <i className="fas fa-sliders-h text-gray-400 hover:text-white"></i>
                    </button>
                </div>

                {/* Filter Dropdown */}
                {showFilters && (
                    <div className="mt-4 p-6 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-4 duration-200">
                        <h3 className="text-lg font-bold text-white mb-4">Filter Events</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Category Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="" className="bg-gray-900 text-gray-400">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name} className="bg-gray-900 text-white">
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Location/Type Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="" className="bg-gray-900 text-gray-400">All Types</option>
                                    <option value="online" className="bg-gray-900 text-white">Online</option>
                                    <option value="physical" className="bg-gray-900 text-white">Physical</option>
                                    <option value="hybrid" className="bg-gray-900 text-white">Hybrid</option>
                                </select>
                            </div>
                        </div>

                        {/* Clear All */}
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => {
                                    setSearchTerm('')
                                    setSelectedCategory('')
                                    setSelectedType('')
                                }}
                                className="text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* EVENTS GRID */}
            <section className="directory-section">
                <div className="section-header">
                    <h2 className="section-title font-display">Upcoming Events</h2>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500 mb-4"></i>
                        <p className="text-gray-400">Loading events...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                        <i className="far fa-calendar-times text-4xl text-gray-500 mb-4"></i>
                        <h3 className="text-xl font-bold text-white mb-2">No events found</h3>
                        <p className="text-gray-400">Try adjusting your filters or search terms.</p>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedCategory(''); setSelectedType(''); }}
                            className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold transition-all"
                        >
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    <div className="expert-grid">
                        {events.map(event => (
                            <Link href={`/login?redirect=/events/${event.id}`} key={event.id} className="block group">
                                <div className="expert-card-glass h-full flex flex-col p-0 overflow-hidden hover:border-blue-500/30 transition-all duration-300">
                                    <div className="w-full h-48 relative overflow-hidden">
                                        {event.cover_url ? (
                                            <img
                                                src={event.cover_url}
                                                alt={event.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                                <i className="fas fa-calendar-alt text-4xl text-white/20"></i>
                                            </div>
                                        )}

                                        {event.categories && event.categories.length > 0 && (
                                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 shadow-lg">
                                                {event.categories[0].name}
                                            </div>
                                        )}
                                        {event.price && event.price > 0 && (
                                            <div className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                                                {event.currency} {event.price}
                                            </div>
                                        )}
                                        {(event.price === 0 || event.price === null) && (
                                            <div className="absolute bottom-4 left-4 bg-green-600/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                                                FREE
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 flex flex-col flex-grow">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                                                {event.start_datetime ? format(new Date(event.start_datetime), 'MMM d, yyyy') : 'TBA'}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                            <span className="text-xs text-gray-400 capitalize">{event.type}</span>
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-3 leading-tight group-hover:text-blue-400 transition-colors line-clamp-2">
                                            {event.title}
                                        </h3>

                                        <p className="text-gray-400 text-sm mb-4 flex items-center gap-2 mt-auto">
                                            <i className="fas fa-map-marker-alt opacity-70"></i>
                                            <span className="truncate">
                                                {event.type === 'online' ? 'Online Event' : (event.location || event.venue_name || 'TBA')}
                                            </span>
                                        </p>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/10 w-full mt-2">
                                            <div className="flex items-center gap-2">
                                                {event.organizer_avatar ? (
                                                    <img src={event.organizer_avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-400">
                                                        <i className="fas fa-user"></i>
                                                    </div>
                                                )}
                                                <span className="text-xs text-gray-500 truncate max-w-[120px]">
                                                    {event.organizer_name || 'Organizer'}
                                                </span>
                                            </div>
                                            <span className="text-white group-hover:text-blue-400 font-bold text-sm transition-colors flex items-center gap-1">
                                                Details <i className="fas fa-arrow-right text-xs transform group-hover:translate-x-1 transition-transform"></i>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

        </div>
    )
}

export default function EventsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EventsContent />
        </Suspense>
    )
}
