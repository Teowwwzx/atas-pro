"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Toaster, toast } from 'react-hot-toast'
import {
    getProfileByUserId,
    getMe,
    createEvent,
    createEventProposal,
    inviteEventParticipant,
    generateAiText,
    getMyEventHistory
} from '@/services/api'
import { ProfileResponse, UserMeResponse, EventDetails } from '@/services/api.types'
import { PlacesAutocomplete } from '@/components/ui/PlacesAutocomplete'
import { showDraftRestoreToast } from '@/components/ui/DraftRestoreToast'
import { format } from 'date-fns'

export default function BookingPage() {
    const params = useParams()
    const router = useRouter()
    const expertId = params.expertId as string

    const [expert, setExpert] = useState<ProfileResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [currentUser, setCurrentUser] = useState<UserMeResponse | null>(null)

    // Booking Mode State
    const [bookingMode, setBookingMode] = useState<'new' | 'existing'>('new')
    const [myEvents, setMyEvents] = useState<EventDetails[]>([])
    const [selectedEventId, setSelectedEventId] = useState('')

    // New Event Form State
    const [title, setTitle] = useState('Guest Speaker / Keynote')
    const [startDatetime, setStartDatetime] = useState('')
    const [endDatetime, setEndDatetime] = useState('')
    const [meetingType, setMeetingType] = useState<'physical' | 'online'>('physical')
    const [venue, setVenue] = useState('')
    const [venuePlaceId, setVenuePlaceId] = useState('')
    const [message, setMessage] = useState('')
    const [maxParticipants, setMaxParticipants] = useState('50')
    const [phoneNumber, setPhoneNumber] = useState('')

    const [aiLoading, setAiLoading] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [expProfile, me, events] = await Promise.all([
                    getProfileByUserId(expertId),
                    getMe(),
                    getMyEventHistory('organized').catch(() => [])
                ])
                setExpert(expProfile)
                setCurrentUser(me)
                setMyEvents(events || [])

                const toDatetimeLocalValue = (value: unknown) => {
                    if (!value || typeof value !== 'string') return ''
                    const trimmed = value.trim()
                    if (!trimmed) return ''
                    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
                        return trimmed.slice(0, 16)
                    }
                    const d = new Date(trimmed)
                    if (Number.isNaN(d.getTime())) return ''
                    const pad = (n: number) => n.toString().padStart(2, '0')
                    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                }

                // Check for saved draft from public profile modal
                showDraftRestoreToast(`booking_draft_${expertId}`, (draft) => {
                    const draftAny = draft as any

                    // Restore Logic
                    const topic = draftAny.topic || draftAny.title
                    if (topic) setTitle(topic)

                    const eventTypeRaw = draftAny.eventType || draftAny.event_type || draftAny.type
                    if (eventTypeRaw === 'online' || eventTypeRaw === 'physical') {
                        setMeetingType(eventTypeRaw)
                    } else if (eventTypeRaw === 'hybrid') {
                        setMeetingType('physical')
                    }

                    const restoredStart = toDatetimeLocalValue(draftAny.startDatetime || draftAny.start_datetime)
                    if (restoredStart) setStartDatetime(restoredStart)

                    const restoredEnd = toDatetimeLocalValue(draftAny.endDatetime || draftAny.end_datetime)
                    if (restoredEnd) {
                        setEndDatetime(restoredEnd)
                    } else {
                        const durationValue = draftAny.duration || draftAny.duration_minutes
                        const mins = typeof durationValue === 'string' || typeof durationValue === 'number' ? Number(durationValue) : NaN
                        if (!Number.isNaN(mins) && mins > 0 && restoredStart) {
                            const startDate = new Date(restoredStart)
                            if (!Number.isNaN(startDate.getTime())) {
                                const endDate = new Date(startDate.getTime() + mins * 60000)
                                setEndDatetime(toDatetimeLocalValue(endDate.toISOString()))
                            }
                        }
                    }

                    const venueAddress =
                        draftAny.venue_address ||
                        draftAny.venueAddress ||
                        draftAny.venue_remark ||
                        draftAny.venue

                    if (venueAddress) {
                        setVenue(venueAddress)
                    }

                    const placeId =
                        draftAny.place_id ||
                        draftAny.placeId ||
                        draftAny.venue_place_id ||
                        draftAny.venuePlaceId

                    if (placeId) setVenuePlaceId(placeId)

                    const maxParticipantsValue =
                        draftAny.maxParticipants ||
                        draftAny.max_participants ||
                        draftAny.max_participant

                    if (maxParticipantsValue !== undefined && maxParticipantsValue !== null && `${maxParticipantsValue}`.trim()) {
                        setMaxParticipants(`${maxParticipantsValue}`)
                    }

                    if (draftAny.phoneNumber || draftAny.phone_number) {
                        setPhoneNumber(draftAny.phoneNumber || draftAny.phone_number)
                    }

                    if (draftAny.message) {
                        let finalMessage = draftAny.message
                        if (me && !draftAny.message.includes('Contact Information:')) {
                            finalMessage += `\n\n---\nContact Information:\nName: ${me.full_name || 'Not provided'}\nEmail: ${me.email || 'Not provided'}\nPhone: (Please fill in below)`
                        }
                        setMessage(finalMessage)
                    }
                })

            } catch (error: any) {
                console.error(error)

                // Handle 404 - expert doesn't exist (stale draft)
                if (error.response?.status === 404) {
                    toast.error('Expert not found. Cleaning up stale draft...')
                    localStorage.removeItem(`booking_draft_${expertId}`)
                    setTimeout(() => {
                        window.location.href = '/dashboard'
                    }, 2000)
                } else {
                    toast.error('Failed to load expert details')
                }
            } finally {
                setLoading(false)
            }
        }
        if (expertId) fetchData()
    }, [expertId])

    // Auto-update message with phone number in real-time
    useEffect(() => {
        if (message.includes('Contact Information:')) {
            // Use regex to find and replace the Phone line
            const phoneRegex = /Phone: .*/
            const newPhoneText = phoneNumber ? phoneNumber : '(Please fill in below)'
            const updatedMessage = message.replace(phoneRegex, `Phone: ${newPhoneText}`)

            // Only update if changed to avoid infinite loop
            if (updatedMessage !== message) {
                setMessage(updatedMessage)
            }
        }
    }, [phoneNumber])

    // Auto-update organizer name in message
    useEffect(() => {
        if (currentUser?.full_name && message) {
            // Replace "My name is X" pattern
            const nameRegex = /My name is [^,]+,/
            const updatedMessage = message.replace(nameRegex, `My name is ${currentUser.full_name},`)

            if (updatedMessage !== message) {
                setMessage(updatedMessage)
            }
        }
    }, [currentUser?.full_name])

    // Auto-update event title/topic in message
    useEffect(() => {
        if (title && message) {
            // Replace topic pattern: the topic of "X" or regarding "X"
            const topicRegex = /(the topic of|regarding) "[^"]+"/
            const match = message.match(topicRegex)

            if (match) {
                const prefix = match[1] // "the topic of" or "regarding"
                const updatedMessage = message.replace(topicRegex, `${prefix} "${title}"`)

                if (updatedMessage !== message) {
                    setMessage(updatedMessage)
                }
            }
        }
    }, [title])

    const durationStr = useMemo(() => {
        if (!startDatetime || !endDatetime) return ''
        const start = new Date(startDatetime)
        const end = new Date(endDatetime)

        const diff = (end.getTime() - start.getTime()) / (1000 * 60) // minutes

        if (diff <= 0) return 'Invalid duration'

        const hours = Math.floor(diff / 60)
        const mins = diff % 60
        if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
        if (hours > 0) return `${hours}h`
        return `${mins}m`
    }, [startDatetime, endDatetime])

    const handleAiRewrite = async () => {
        if (!message) {
            toast.error("Please write a draft message first")
            return
        }
        setAiLoading(true)
        try {
            // Get user's name from currentUser or fallback to "Event Organizer"
            const userName = currentUser?.full_name || currentUser?.email || "Event Organizer"

            const prompt = `
            Rewrite this booking request message to be professional, persuasive, and polite.
            It is for an expert speaker invitation.
            
            Context:
            - Organizer Name: ${userName}
            - Expert Name: ${expert?.full_name}
            - Event Type: ${title}
            - User Draft: "${message}"
            
            Instructions:
            - Use the organizer's name (${userName}) instead of placeholders
            - Address the expert (${expert?.full_name}) professionally
            - Make it warm and personalized
            - Do NOT include any placeholder text like [Your Name], [Phone], [Date], etc.
            
            Output only the rewritten message.
            `
            const res = await generateAiText(prompt)
            if (res.result && !res.result.startsWith("Error")) {
                setMessage(res.result)
                toast.success("Rewritten by AI!")
            } else {
                toast.error("AI service unavailable")
            }
        } catch (e) {
            console.error(e)
            toast.error("AI Rewrite failed")
        } finally {
            setAiLoading(false)
        }
    }

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        if (!message) {
            toast.error('Please write a message')
            setSubmitting(false)
            return
        }

        let eventId = selectedEventId
        let eventTitle = title

        if (bookingMode === 'new') {
            if (!startDatetime || !endDatetime || !title) {
                toast.error('Please fill in all fields')
                setSubmitting(false)
                return
            }

            const startDateTime = new Date(startDatetime)
            const endDateTime = new Date(endDatetime)

            if (endDateTime <= startDateTime) {
                toast.error('End time must be after start time')
                setSubmitting(false)
                return
            }

            try {
                const newEvent = await createEvent({
                    title: title,
                    description: undefined, // Don't use proposal message as public description
                    start_datetime: format(startDateTime, "yyyy-MM-dd'T'HH:mm:ssXXX"),
                    end_datetime: format(endDateTime, "yyyy-MM-dd'T'HH:mm:ssXXX"),
                    venue_place_id: venuePlaceId || null,
                    venue_remark: venue,
                    type: meetingType,
                    format: 'seminar',
                    cover_url: undefined,
                    logo_url: undefined,
                    registration_type: 'free',
                    visibility: 'private',
                    max_participant: parseInt(maxParticipants) || 50,
                    remark: 'Created via Expert Booking',
                })
                eventId = newEvent.id
            } catch (error) {
                console.error(error)
                toast.error('Failed to create event')
                setSubmitting(false)
                return
            }
        } else {
            if (!selectedEventId) {
                toast.error('Please select an event')
                setSubmitting(false)
                return
            }
            const selectedEvent = myEvents.find(e => e.id === selectedEventId)
            if (selectedEvent) {
                eventTitle = selectedEvent.title
            }
        }

        try {
            // 2. Create Proposal (Inherit info)
            const proposal = await createEventProposal(eventId, {
                title: `Invitation: ${eventTitle}`,
                description: message,
                file_url: null
            })

            // 3. Invite Expert
            await inviteEventParticipant(eventId, {
                user_id: expertId,
                role: 'speaker',
                description: message,
                proposal_id: proposal.id
            })

            toast.success('Booking request sent successfully!')
            router.push('/dashboard')
        } catch (error) {
            console.error(error)
            toast.error('Failed to submit booking')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>
    if (!expert) return <div className="flex h-screen items-center justify-center">Expert not found</div>

    return (
        <div className="min-h-screen p-6 md:p-12 font-sans text-slate-800">
            <Toaster />

            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header Link */}
                <Link href={`/profile/${expertId}`} className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Profile
                </Link>

                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Request a Booking</h1>

                {/* You Are Booking Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4">You Are Booking</p>
                    <div className="flex items-center gap-4 mb-6">
                        <img
                            src={`https://placehold.co/128x128/png?text=${encodeURIComponent(expert.full_name)}`}
                            alt="Profile"
                            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                        />
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{expert.full_name}</h3>
                            <p className="text-slate-500">{expert.title || 'Expert'}</p>
                            {expert?.skills_list && expert.skills_list.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {expert.skills_list.slice(0, 5).map((skill: string, idx: number) => (
                                        <span key={idx} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                                            {skill}
                                        </span>
                                    ))}
                                    {expert.skills_list.length > 5 && (
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                                            +{expert.skills_list.length - 5}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Booking Form */}
                <form onSubmit={handleBook} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-8">

                    {/* Mode Selection */}
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setBookingMode('new')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${bookingMode === 'new' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Create New Event
                        </button>
                        <button
                            type="button"
                            onClick={() => setBookingMode('existing')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${bookingMode === 'existing' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Select Existing Event
                        </button>
                    </div>

                    {bookingMode === 'existing' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Select Event</label>
                                {myEvents.length === 0 ? (
                                    <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
                                        You don't have any organized events yet. Please create a new event.
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search your events..."
                                            onChange={(e) => {
                                                const searchTerm = e.target.value.toLowerCase()
                                                if (!searchTerm) {
                                                    setSelectedEventId('')
                                                    return
                                                }
                                                // Find matching event
                                                const match = myEvents.find(event =>
                                                    event.title.toLowerCase().includes(searchTerm)
                                                )
                                                if (match) setSelectedEventId(match.id)
                                            }}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700"
                                        />
                                        <div className="absolute right-3 top-3 text-slate-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        {/* Event List */}
                                        <div className="mt-2 max-h-60 overflow-y-auto space-y-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                            {myEvents.map(event => (
                                                <button
                                                    key={event.id}
                                                    type="button"
                                                    onClick={() => setSelectedEventId(event.id)}
                                                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${selectedEventId === event.id
                                                        ? 'bg-slate-900 text-white shadow-md'
                                                        : 'bg-white hover:bg-slate-100 text-slate-700'
                                                        }`}
                                                >
                                                    <div className="font-bold text-sm">{event.title}</div>
                                                    <div className={`text-xs mt-1 ${selectedEventId === event.id ? 'text-slate-300' : 'text-slate-500'}`}>
                                                        {new Date(event.start_datetime).toLocaleDateString()} • {event.type}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Selected Event Preview */}
                            {selectedEventId && (() => {
                                const evt = myEvents.find(e => e.id === selectedEventId)
                                if (!evt) return null
                                return (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
                                        <p><span className="font-bold">Date:</span> {new Date(evt.start_datetime).toLocaleString()} - {new Date(evt.end_datetime).toLocaleString()}</p>
                                        <p><span className="font-bold">Venue:</span> {evt.venue_remark || 'No venue specified'}</p>
                                        <p><span className="font-bold">Status:</span> <span className="uppercase text-xs font-bold px-2 py-0.5 bg-slate-200 rounded">{evt.status}</span></p>
                                    </div>
                                )
                            })()}
                        </div>
                    ) : (
                        <>
                            {/* Event Title */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Event Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Keynote Speech at Tech Summit"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700"
                                />
                            </div>

                            {/* Meeting Type */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Meeting Type</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                                        <input
                                            type="radio"
                                            name="meetingType"
                                            value="physical"
                                            checked={meetingType === 'physical'}
                                            onChange={() => setMeetingType('physical')}
                                            className="w-4 h-4 text-slate-900 focus:ring-slate-500"
                                        />
                                        <span className="text-slate-700 font-medium text-sm">Physical Venue</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                                        <input
                                            type="radio"
                                            name="meetingType"
                                            value="online"
                                            checked={meetingType === 'online'}
                                            onChange={() => setMeetingType('online')}
                                            className="w-4 h-4 text-slate-900 focus:ring-slate-500"
                                        />
                                        <span className="text-slate-700 font-medium text-sm">Online / Virtual</span>
                                    </label>
                                </div>
                            </div>

                            {/* Start & End DateTime */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Start DateTime</label>
                                    <input
                                        type="datetime-local"
                                        value={startDatetime}
                                        onChange={(e) => setStartDatetime(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">End DateTime</label>
                                    <input
                                        type="datetime-local"
                                        value={endDatetime}
                                        onChange={(e) => setEndDatetime(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Duration Display */}
                            {durationStr && (
                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Duration: <span className="text-slate-900 font-bold">{durationStr}</span>
                                </div>
                            )}

                            {/* Venue & Max Participants */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        {meetingType === 'physical' ? 'Venue Address' : 'Meeting Link / Platform'}
                                    </label>
                                    {meetingType === 'physical' ? (
                                        <PlacesAutocomplete
                                            defaultValue={venue}
                                            onPlaceSelect={(place) => {
                                                setVenue(place.label)
                                                setVenuePlaceId(place.value?.place_id || '')
                                            }}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="e.g. Zoom Link or Google Meet URL"
                                            value={venue}
                                            onChange={(e) => {
                                                setVenue(e.target.value)
                                                setVenuePlaceId('') // Clear place ID for online events
                                            }}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Est. Participants</label>
                                    <input
                                        type="number"
                                        placeholder="50"
                                        value={maxParticipants}
                                        onChange={(e) => setMaxParticipants(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Phone Number */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                        <input
                            type="tel"
                            placeholder="e.g. +60 12-345 6789"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all outline-none text-slate-700 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Proposal Message */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-slate-700">Proposal Message</label>
                            <button
                                type="button"
                                onClick={handleAiRewrite}
                                disabled={aiLoading}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50"
                            >
                                {aiLoading ? (
                                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                )}
                                {aiLoading ? 'Rewriting...' : 'AI Rewrite'}
                            </button>
                        </div>
                        <div className="relative">
                            <textarea
                                rows={6}
                                placeholder="Describe your event and why you'd like the expert to speak..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-50 transition-all outline-none text-slate-700 placeholder:text-slate-400 bg-purple-50/10 resize-none"
                            />
                            <div className="absolute bottom-3 right-3">
                                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                                    ATAS AI
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-xl hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Sending Request...' : 'Send Booking Request'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}
