import React, { useState, useEffect } from 'react'
import { EventDetails, ProfileResponse } from '@/services/api.types'
import { updateEvent } from '@/services/api'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { differenceInDays, differenceInHours, intervalToDuration, formatDuration } from 'date-fns'
import useSWR from 'swr'
import { getEventAttendanceStats, getEventChecklist, listCategories, getEventCategories, attachEventCategories } from '@/services/api'
import { EventPhase, canEditCoreDetails } from '@/lib/eventPhases'
import { CategoryResponse } from '@/services/api.types'
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete'
import { useLoadScript } from '@react-google-maps/api'


const libraries: ("places")[] = ["places"]

interface DashboardTabOverviewProps {
    event: EventDetails
    user: ProfileResponse | null
    role?: string | null
    phase: EventPhase // Add phase prop
    onUpdate: () => void
}

export function DashboardTabOverview({ event, user, role, phase, onUpdate }: DashboardTabOverviewProps) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)


    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    })

    // Check permissions
    const isOrganizer = user?.user_id === event.organizer_id
    const isCommittee = role === 'committee'
    const canEdit = isOrganizer || isCommittee

    // Date Logic
    const startDate = new Date(event.start_datetime)
    const endDate = new Date(event.end_datetime)
    const now = new Date()

    const isEnded = now > endDate
    const isOngoing = now >= startDate && now <= endDate
    const daysLeft = differenceInDays(startDate, now)



    // Category State
    const [allCategories, setAllCategories] = useState<CategoryResponse[]>([])
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])

    // Fetch Categories
    useEffect(() => {
        const fetchCats = async () => {
            try {
                const [all, mine] = await Promise.all([
                    listCategories(),
                    getEventCategories(event.id)
                ])
                setAllCategories(all)
                setSelectedCategories(mine.map(c => c.id))
            } catch (e) {
                console.error("Failed to load categories")
            }
        }
        fetchCats()
    }, [event.id])

    // Form State (Content focus)
    const [form, setForm] = useState({
        title: event.title,
        description: event.description || '',
        remark: event.remark || '',
        meeting_url: event.meeting_url || '',
        start_datetime: event.start_datetime.slice(0, 16),
        end_datetime: event.end_datetime.slice(0, 16),
        venue_remark: event.venue_remark || '',
        venue_place_id: event.venue_place_id || '',
        max_participant: event.max_participant || 0,
        format: event.format || 'workshop',
        type: event.type || 'physical',
    })

    const isConfigLocked = isOngoing || isEnded

    const handleUpdate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!canEdit) return

        setLoading(true)
        try {
            // 1. Update Core Details
            await updateEvent(event.id, {
                ...form,
                start_datetime: new Date(form.start_datetime).toISOString(),
                end_datetime: new Date(form.end_datetime).toISOString(),
                max_participant: form.max_participant > 0 ? form.max_participant : null,
            })

            // 2. Update Categories
            // Only update if changed (optional optimization, but api call is cheap enough here)
            await attachEventCategories(event.id, { category_ids: selectedCategories })

            toast.success('Event content updated')
            setIsEditing(false) // Exit edit mode on success

            // We need to refresh parent to see changes if title/desc changed, 
            // but for categories we might need to manually trigger something or just rely on local state if we displayed it from local state.
            // However, the "Read Mode" uses `selectedCategories` state? 
            // Actually better to re-fetch categories to be sure or just trust local state.
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update event')
        } finally {
            setLoading(false)
        }
    }

    // Fetch Stats
    const { data: stats } = useSWR(`/events/${event.id}/attendance/stats`, () => getEventAttendanceStats(event.id))
    const { data: checklist } = useSWR(`/events/${event.id}/checklist`, () => getEventChecklist(event.id))
    const totalParticipants = stats?.total_participants || 0

    // Checklist Stats
    const totalTasks = checklist?.length || 0
    const completedTasks = checklist?.filter(i => i.is_completed).length || 0
    const tasksLeft = totalTasks - completedTasks

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn space-y-6">
            <div className="w-full">
                {isEditing && canEdit ? (
                    // EDIT MODE
                    <form onSubmit={handleUpdate} className="bg-white rounded-[2.5rem] border border-zinc-200 p-10 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black text-zinc-900">Edit Details</h3>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-5 py-2.5 text-zinc-600 font-bold text-sm hover:text-zinc-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-zinc-800 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {isConfigLocked && (
                                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-2xl text-sm font-medium border border-yellow-100 flex items-center gap-3">
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Core event details (Date, Time, Venue, Format) are locked because the event has started or ended.
                                </div>
                            )}

                            {/* Logistics Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Start Date</label>
                                    <input
                                        type="datetime-local"
                                        disabled={isConfigLocked}
                                        value={form.start_datetime}
                                        onChange={(e) => setForm({ ...form, start_datetime: e.target.value })}
                                        className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">End Date</label>
                                    <input
                                        type="datetime-local"
                                        disabled={isConfigLocked}
                                        value={form.end_datetime}
                                        onChange={(e) => setForm({ ...form, end_datetime: e.target.value })}
                                        className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Event Format</label>
                                    <select
                                        disabled={isConfigLocked}
                                        value={form.format}
                                        onChange={(e) => setForm({ ...form, format: e.target.value as any })}
                                        className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:border-yellow-400 py-3 px-4 text-zinc-700 capitalize disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <option value="workshop">Workshop</option>
                                        <option value="seminar">Seminar</option>
                                        <option value="webinar">Webinar</option>
                                        <option value="panel_discussion">Panel Discussion</option>
                                        <option value="club_event">Club Event</option>
                                        <option value="conference">Conference</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Event Type</label>
                                    <select
                                        disabled={isConfigLocked}
                                        value={form.type}
                                        onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                                        className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:border-yellow-400 py-3 px-4 text-zinc-700 capitalize disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <option value="physical">Physical</option>
                                        <option value="online">Online</option>
                                        <option value="hybrid">Hybrid</option>
                                    </select>
                                </div>
                            </div>

                            {/* Venue / Location */}
                            {!isConfigLocked && (
                                <div>
                                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Venue</label>
                                    {isLoaded ? (
                                        <PlacesAutocomplete
                                            value={form.venue_remark}
                                            onChange={(address) => setForm({ ...form, venue_remark: address })}
                                            onSelect={async (address) => {
                                                setForm(prev => ({ ...prev, venue_remark: address }))
                                                try {
                                                    const results = await geocodeByAddress(address)
                                                    const placeId = results[0].place_id
                                                    setForm(prev => ({ ...prev, venue_place_id: placeId }))
                                                } catch (error) {
                                                    console.error('Error selecting place', error)
                                                }
                                            }}
                                        >
                                            {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                                                <div className="relative">
                                                    <input
                                                        {...getInputProps({
                                                            placeholder: 'Search for a location...',
                                                            className: "block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-700"
                                                        })}
                                                    />
                                                    {suggestions.length > 0 && (
                                                        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden">
                                                            {loading && <div className="p-3 text-sm text-black">Loading...</div>}
                                                            {suggestions.map((suggestion) => {
                                                                const className = suggestion.active
                                                                    ? 'px-4 py-3 bg-yellow-50 cursor-pointer'
                                                                    : 'px-4 py-3 bg-white cursor-pointer hover:bg-gray-50';
                                                                const { key, ...optionProps } = getSuggestionItemProps(suggestion, { className });
                                                                return (
                                                                    <div key={suggestion.placeId} {...optionProps}>
                                                                        <div className="font-bold text-zinc-900 text-sm">{suggestion.formattedSuggestion.mainText}</div>
                                                                        <div className="text-xs text-zinc-500">{suggestion.formattedSuggestion.secondaryText}</div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </PlacesAutocomplete>
                                    ) : (
                                        <div className="block w-full rounded-2xl border-zinc-200 bg-zinc-100 py-3 px-4 text-zinc-400">Loading Maps...</div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Max Participants</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.max_participant}
                                    onChange={(e) => setForm({ ...form, max_participant: parseInt(e.target.value) || 0 })}
                                    className="text-gray-700 block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4"
                                />
                                <p className="text-[10px] text-gray-700 mt-2 font-medium">Set to 0 for unlimited.</p>
                            </div>

                            <div className="w-full h-px bg-zinc-100 my-4"></div>

                            <div>
                                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Title</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-gray-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                    rows={5}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900 text-sm leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Remarks / Notes</label>
                                <textarea
                                    rows={3}
                                    value={form.remark}
                                    onChange={(e) => setForm({ ...form, remark: e.target.value })}
                                    placeholder="Any extra info for participants..."
                                    className="block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-zinc-900 text-sm"
                                />
                            </div>

                            {event.type === 'online' && (
                                <div>
                                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Meeting URL</label>
                                    <input
                                        type="url"
                                        value={form.meeting_url}
                                        onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
                                        placeholder="https://zoom.us/..."
                                        className="text-gray-700 block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 py-3 px-4 text-grey-700"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-3">Categories</label>
                                <div className="flex flex-wrap gap-2">
                                    {allCategories.map(cat => {
                                        const isSelected = selectedCategories.includes(cat.id)
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCategories(prev =>
                                                        isSelected ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                                                    )
                                                }}
                                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${isSelected
                                                    ? 'bg-zinc-900 text-white border-zinc-900'
                                                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                                                    }`}
                                            >
                                                {cat.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </form>
                ) : (
                    // READ ONLY MODE (Redesigned - Clean & Compact)
                    // READ ONLY MODE (Redesigned - Professional Widget View)
                    <div className="space-y-8">
                        {/* 1. Metrics Grid - 3 Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Checklist Widget (Replaces Status) */}
                            <div className="bg-white rounded-[2rem] p-6 border border-zinc-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`?tab=checklist`, { scroll: false })}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-2xl bg-blue-100 text-blue-600">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    </div>
                                    <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold uppercase tracking-wider">
                                        Tasks
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-3xl font-black text-zinc-900 tracking-tight">{tasksLeft}</h3>
                                        <span className="text-lg text-zinc-400 font-bold">Pending</span>
                                    </div>
                                    <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                            style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-zinc-400 mt-2">
                                        {completedTasks} completed / {totalTasks} total
                                    </p>
                                </div>
                            </div>

                            {/* Timeline Widget */}
                            <div className="bg-white rounded-[2rem] p-6 border border-zinc-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-2xl bg-yellow-100 text-yellow-600">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="px-3 py-1 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100 text-[10px] font-bold uppercase tracking-wider">
                                        Timeline
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        {isEnded ? (
                                            <h3 className="text-3xl font-black text-zinc-400 tracking-tight">Ended</h3>
                                        ) : isOngoing ? (
                                            <h3 className="text-3xl font-black text-green-600 tracking-tight animate-pulse">Happening Now</h3>
                                        ) : (
                                            <h3 className="text-3xl font-black text-zinc-900 tracking-tight">{Math.max(0, daysLeft)} <span className="text-lg text-zinc-400 font-bold">Days Left</span></h3>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-zinc-400">
                                        {isEnded ? 'Event has concluded' : isOngoing ? 'Event is currently ongoing' : 'Until event starts'}
                                    </p>
                                </div>
                            </div>

                            {/* Registrations Widget */}
                            <div className="bg-white rounded-[2rem] p-6 border border-zinc-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-2xl bg-purple-100 text-purple-600">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div className="px-3 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100 text-[10px] font-bold uppercase tracking-wider">
                                        Capacity
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-3xl font-black text-zinc-900 tracking-tight">{totalParticipants}</h3>
                                        <span className="text-lg text-zinc-400 font-bold">/ {event.max_participant ? event.max_participant : '∞'}</span>
                                    </div>
                                    <p className="text-sm font-medium text-zinc-400">
                                        Registered participants
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Main Detail Card */}
                        <div className="bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden shadow-sm p-8 md:p-10 relative">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    {/* <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div> */}
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-xl font-black text-zinc-900">Event Details</h3>

                                        {/* Categories Display */}
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCategories.length > 0 ? (
                                                selectedCategories.map(id => {
                                                    const cat = allCategories.find(c => c.id === id)
                                                    if (!cat) return null
                                                    return (
                                                        <span key={id} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wide">
                                                            {cat.name}
                                                        </span>
                                                    )
                                                })
                                            ) : (
                                                <span className="text-xs font-medium text-zinc-400 italic">No categories set</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {canEdit && canEditCoreDetails(phase) && (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="h-10 px-4 rounded-xl bg-black text-white font-bold text-xs hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-lg shadow-zinc-200"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Edit Details
                                        </button>
                                    )}

                                </div>
                            </div>

                            <div className="flex flex-col gap-8">
                                {/* Metadata Row (Moved from right column) */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-zinc-200 text-zinc-400">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Format</h4>
                                            <p className="text-sm font-bold text-zinc-900 capitalize">{event.format?.replace('_', ' ') || '-'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-zinc-200 text-zinc-400">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Type</h4>
                                            <p className="text-sm font-bold text-zinc-900 capitalize">{event.type || '-'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-zinc-200 text-zinc-400">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Duration</h4>
                                            <p className="text-sm font-bold text-zinc-900 capitalize">
                                                {formatDuration(intervalToDuration({
                                                    start: new Date(event.start_datetime),
                                                    end: new Date(event.end_datetime)
                                                }), { format: ['hours', 'minutes'] }) || '0m'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-zinc-200 text-zinc-400">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Location</h4>
                                            <p className="text-sm font-bold text-zinc-900 truncate" title={event.venue_remark || event.location || 'TBD'}>
                                                {event.venue_remark || event.location || (event.meeting_url ? 'Online Meeting' : 'To Be Announced')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="prose prose-zinc prose-sm max-w-none">
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Description</h4>
                                    <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap text-[15px]">
                                        {form.description || <span className="italic text-zinc-400">No description provided for this event yet. Click edit to add one.</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>


        </div >
    )
}
