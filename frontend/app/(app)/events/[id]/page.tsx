'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventById, joinPublicEvent, leaveEvent, getMe, getEventAttendanceStats, setEventReminder, deleteEventReminder, getPublicOrganizations, getReviewsByEvent, getMyParticipationSummary, getMyReminders, getEventExternalChecklist, uploadPaymentProof, getEventParticipants, createOrGetConversation, getMyFollows } from '@/services/api'
import { EventDetails, UserMeResponse, EventAttendanceStats, OrganizationResponse, ReviewResponse, EventReminderResponse, EventReminderOption, EventChecklistItemResponse, EventParticipantDetails, FollowDetails } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import Link from 'next/link'
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api'
import { AttendanceQRModal } from '@/components/event/AttendanceQRModal'
import { ParticipantsModal } from '@/components/event/ParticipantsModal'
import { EventReviewModal } from '@/components/event/EventReviewModal'
import { SponsorInfoModal } from '@/components/profile/SponsorInfoModal'
import { getEventPhase, EventPhase } from '@/lib/eventPhases'
import { EventBadge } from '@/components/ui/EventBadge'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { ResourcePreviewModal } from '@/components/ui/ResourcePreviewModal'
import { ReminderModal } from '@/components/event/ReminderModal'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { formatEventDate, formatEventTimeRange } from '@/lib/date'

export default function EventDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string

    const [event, setEvent] = useState<EventDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<UserMeResponse | null>(null)
    const [registering, setRegistering] = useState(false)
    // Remove conflicting state declaration
    // const [isParticipant, setIsParticipant] = useState(false) 
    const [isJoinedAccepted, setIsJoinedAccepted] = useState(false)
    const [reminding, setReminding] = useState(false)
    const [showLeaveModal, setShowLeaveModal] = useState(false)
    const [showReminderModal, setShowReminderModal] = useState(false)
    const [myReminder, setMyReminder] = useState<EventReminderResponse | null>(null)
    const [stats, setStats] = useState<EventAttendanceStats | null>(null)
    const [hostOrg, setHostOrg] = useState<OrganizationResponse | null>(null)
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [reviewsLoading, setReviewsLoading] = useState(false)
    const [reviewsAvg, setReviewsAvg] = useState<number>(0)
    const [reviewsCount, setReviewsCount] = useState<number>(0)
    const [showQRModal, setShowQRModal] = useState(false)
    const [participantStatus, setParticipantStatus] = useState<string | null>(null)
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
    const [currentPhase, setCurrentPhase] = useState<EventPhase>(EventPhase.DRAFT)
    const [showImageModal, setShowImageModal] = useState(false)
    const [showPaymentQRModal, setShowPaymentQRModal] = useState(false)
    const [externalChecklist, setExternalChecklist] = useState<EventChecklistItemResponse[]>([])
    const [uploadingProof, setUploadingProof] = useState(false)
    const [previewResource, setPreviewResource] = useState<{ title: string, url: string, type?: any } | null>(null)
    const [participants, setParticipants] = useState<EventParticipantDetails[]>([])
    const [myFollows, setMyFollows] = useState<FollowDetails[]>([])
    const [showParticipantsModal, setShowParticipantsModal] = useState(false)
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [showSponsorInfoModal, setShowSponsorInfoModal] = useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB')
            return
        }

        setUploadingProof(true)
        try {
            await uploadPaymentProof(id, file)
            toast.success('Payment proof uploaded successfully!')
            fetchData() // Refresh status
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Failed to upload payment proof')
        } finally {
            setUploadingProof(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: ['places'] as ("places")[],
    })
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
    const [venueAddress, setVenueAddress] = useState<string | null>(null)

    const [mapError, setMapError] = useState(false)

    useEffect(() => {
        if (!isLoaded || !event?.venue_place_id) return
        setMapError(false)
        // @ts-ignore
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ placeId: event.venue_place_id }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
                const loc = results[0].geometry.location
                const json = loc.toJSON()
                setMapCenter({ lat: json.lat, lng: json.lng })
                setVenueAddress(results[0].formatted_address || null)
            } else {
                setMapError(true)
                setVenueAddress(null)
            }
        })
    }, [isLoaded, event?.venue_place_id])

    useEffect(() => {
        if (id) {
            fetchData()
        }
    }, [id])

    // Removed separate useEffects for hostOrg and reviews to prevent waterfalls
    // They are now integrated into fetchData

    const [myRole, setMyRole] = useState<string | null>(null)

    const fetchData = async () => {
        try {
            // Batch 1: Core Event & User Data (Parallel)
            const [eventData, userData] = await Promise.all([
                getEventById(id),
                getMe().catch(() => null)
            ])

            setEvent(eventData)
            setUser(userData)
            setCurrentPhase(getEventPhase(eventData))

            // Batch 2: Dependent Data (Parallel)
            // We use a promise array to fetch everything else simultaneously
            const promises: Promise<any>[] = []

            // 2a. User-specific data (only if logged in)
            if (userData) {
                promises.push(
                    getMyParticipationSummary(id)
                        .then(res => ({ type: 'participation', data: res }))
                        .catch(() => ({ type: 'participation', data: null }))
                )
                promises.push(
                    getMyReminders()
                        .then(res => ({ type: 'reminders', data: res }))
                        .catch(() => ({ type: 'reminders', data: [] }))
                )
                promises.push(
                    getEventAttendanceStats(id)
                        .then(res => ({ type: 'stats', data: res }))
                        .catch(() => ({ type: 'stats', data: null }))
                )
                promises.push(
                    getMyFollows()
                        .then(res => ({ type: 'follows', data: res }))
                        .catch(() => ({ type: 'follows', data: [] }))
                )
            }

            // 2b. Public data
            promises.push(
                getEventExternalChecklist(id)
                    .then(res => ({ type: 'checklist', data: res }))
                    .catch(() => ({ type: 'checklist', data: [] }))
            )
            promises.push(
                getReviewsByEvent(id)
                    .then(res => ({ type: 'reviews', data: res }))
                    .catch(() => ({ type: 'reviews', data: [] }))
            )

            if (eventData.organizer_id) {
                promises.push(
                    getPublicOrganizations()
                        .then(orgs => ({ type: 'hostOrg', data: orgs.find((o: OrganizationResponse) => o.owner_id === eventData.organizer_id) || null }))
                        .catch(() => ({ type: 'hostOrg', data: null }))
                )
            }

            promises.push(
                getEventParticipants(id)
                    .then(res => ({ type: 'participants', data: res }))
                    .catch(() => ({ type: 'participants', data: [] }))
            )

            // Execute all secondary requests
            const results = await Promise.all(promises)

            // Process results
            results.forEach(({ type, data }) => {
                switch (type) {
                    case 'participation':
                        if (data) {
                            setIsJoinedAccepted(data.my_status === 'accepted' || data.my_status === 'attended')
                            setParticipantStatus(data.my_status || null)
                            setPaymentStatus(data.payment_status || null)
                            setMyRole(data.my_role || null)
                        } else {
                            setIsJoinedAccepted(false)
                            setParticipantStatus(null)
                            setPaymentStatus(null)
                            setMyRole(null)
                        }
                        break
                    case 'reminders':
                        const existing = Array.isArray(data) ? data.find((r: EventReminderResponse) => r.event_id === id) : null
                        setMyReminder(existing || null)
                        break
                    case 'stats':
                        setStats(data)
                        break
                    case 'follows':
                        setMyFollows(data)
                        break
                    case 'checklist':
                        setExternalChecklist(data)
                        break
                    case 'reviews':
                        setReviews(data)
                        const count = data.length
                        const avg = count > 0 ? data.reduce((s: number, r: ReviewResponse) => s + (r.rating || 0), 0) / count : 0
                        setReviewsCount(count)
                        setReviewsAvg(Number(avg.toFixed(1)))
                        break
                    case 'hostOrg':
                        setHostOrg(data)
                        break
                    case 'participants':
                        setParticipants(data)
                        break
                }
            })

        } catch (error) {
            console.error(error)
            toast.error('Failed to load event details')
            router.push('/dashboard')
        } finally {
            setLoading(false)
            setReviewsLoading(false)
        }
    }

    const handleJoin = async () => {
        if (!user) {
            router.push(`/login?redirect=/events/${id}`)
            return
        }
        setRegistering(true)
        try {
            await joinPublicEvent(id)
            toast.success('Successfully registered!')
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to join event')
        } finally {
            setRegistering(false)
        }
    }

    const handleLeaveClick = () => {
        setShowLeaveModal(true)
    }

    const confirmLeave = async () => {
        setRegistering(true)
        try {
            await leaveEvent(id)
            toast.success('Registration cancelled')
            setShowLeaveModal(false)
            fetchData()
        } catch (error: any) {
            toast.error('Failed to leave event')
        } finally {
            setRegistering(false)
        }
    }

    const handleContactOrganizer = async (role: 'expert' | 'sponsor') => {
        if (!user || !event) {
            router.push(`/login?redirect=/events/${id}`)
            return
        }

        try {
            // 1. Create/Get Conversation
            const conv = await createOrGetConversation([user.id, event.organizer_id])

            // 2. Prepare Context Message
            const contextMsg = `Hi. I'm interested in joining "${event.title}" as a ${role.charAt(0).toUpperCase() + role.slice(1)}.`

            // 3. Redirect to Messages
            router.push(`/messages?conversation_id=${conv.id}&initial_text=${encodeURIComponent(contextMsg)}`)

        } catch (error) {
            console.error(error)
            toast.error('Failed to start conversation')
        }
    }

    const handleReminderClick = () => {
        setShowReminderModal(true)
    }

    const confirmReminder = async (option: string | null) => {
        if (!option) {
            handleRemoveReminder()
            return
        }

        setReminding(true)
        try {
            const newReminder = await setEventReminder(id, { option: option as EventReminderOption })
            toast.success('Preferences saved!')
            setMyReminder(newReminder)
            setShowReminderModal(false)
        } catch (error: any) {
            if (error?.response?.status === 409) {
                toast.success('Preferences saved!')

                try {
                    const reminders = await getMyReminders()
                    const existing = reminders.find(r => r.event_id === id)
                    if (existing) setMyReminder(existing)
                } catch {
                    // Fallback
                }
                setShowReminderModal(false)
            } else {
                toast.error('Error saving preference')
            }
        } finally {
            setReminding(false)
        }
    }

    const handleRemoveReminder = async () => {
        setReminding(true)
        try {
            await deleteEventReminder(id)
            toast.success('Reminder removed')
            setMyReminder(null)
            setShowReminderModal(false)
        } catch (error) {
            toast.error('Failed to remove reminder')
        } finally {
            setReminding(false)
        }
    }

    const handleShare = async () => {
        try {
            const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
            await navigator.clipboard.writeText(shareUrl)
            toast.success('Link copied to clipboard')
        } catch {
            toast.error('Unable to copy link')
        }
    }

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                <Skeleton height="300px" className="rounded-3xl" />
                <div className="space-y-4">
                    <Skeleton height="40px" width="60%" className="rounded-xl" />
                    <Skeleton height="20px" width="40%" className="rounded-lg" />
                </div>
            </div>
        )
    }

    if (!event) return null

    const isOrganizer = user?.id === event.organizer_id
    const isCommittee = myRole === 'committee'
    const isRegistered = myRole === 'participant' || myRole === 'expert' || myRole === 'audience' || myRole === 'student' || myRole === 'teacher'
    const isParticipant = isRegistered && isJoinedAccepted
    const isSpeaker = myRole === 'speaker' && isJoinedAccepted
    const isSponsor = myRole === 'sponsor' && isJoinedAccepted
    const isRegistrationOpen = event.registration_status === 'opened'
    const isAttendanceOpen = currentPhase === EventPhase.EVENT_DAY || currentPhase === EventPhase.ONGOING
    const hasEventStarted = new Date(event.start_datetime) < new Date()
    const currentParticipants = event.participant_count ?? stats?.total_participants ?? 0
    const isFull = event.max_participant ? currentParticipants >= event.max_participant : false

    const friendsGoing = participants.filter(p =>
        (p.status === 'accepted' || p.status === 'attended') &&
        myFollows.some(f => f.followee_id === p.user_id)
    )

    const eventStart = new Date(event.start_datetime)
    const eventEnd = new Date(event.end_datetime)

    const dateLine = formatEventDate(eventStart)
    const timeLine = formatEventTimeRange(eventStart, eventEnd)

    return (
        <div className="w-full min-h-screen pt-8 pb-24">
            <div className="max-w-screen-xl mx-auto px-4 md:px-8">

                {/* 1. Breadcrumb / Back */}
                <div className="flex items-center gap-2 mb-6 text-sm font-medium text-zinc-500">
                    <Link href="/discover" className="hover:text-zinc-900 transition-colors">Events</Link>
                    <span>/</span>
                    <span className="text-zinc-900 truncate max-w-[200px]">{event.title}</span>
                </div>

                {/* 2. Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* --- LEFT COLUMN (Content) --- */}
                    <div className="lg:col-span-8 flex flex-col gap-10">

                        {/* Combined Header Card */}
                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-zinc-100 relative group">
                            <div className="relative h-[450px] w-full">
                                <ImageWithFallback
                                    src={event.cover_url || `https://placehold.co/1200x600/png?text=${encodeURIComponent(event.title)}`}
                                    fallbackSrc={`https://placehold.co/1200x600/png?text=${encodeURIComponent(event.title)}`}
                                    alt={event.title}
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    fill
                                    unoptimized={false}
                                    priority
                                />
                                {/* <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent opacity-90" />
                                <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                                    <EventBadge type="status" value={event.status} className="!text-sm !px-3 !py-1" />
                                    <EventBadge type="type" value={event.type} className="!text-sm !px-3 !py-1" />
                                </div> */}
                            </div>

                            {/* Event Details Content */}
                            <div className="flex flex-col gap-6 p-8">
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <EventBadge type="type" value={event.type} />
                                    </div>
                                    <h1 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tight leading-tight">
                                        {event.title}
                                    </h1>

                                    {/* Partner/Sponsor Validations */}

                                </div>

                                {/* Host Info Row */}
                                <div className="flex flex-wrap items-center gap-6 pb-6 border-b border-zinc-100">
                                    <Link href={`/profile/${event.organizer_id}`} className="flex items-center gap-3 group">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border border-indigo-200 group-hover:border-indigo-400 transition-colors">
                                            {event.organizer_avatar ? (
                                                <img src={event.organizer_avatar} alt={event.organizer_name || 'Organizer'} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{(event.organizer_name || 'Org').charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Hosted by</span>
                                            <span className="font-bold text-zinc-900 group-hover:underline">{event.organizer_name || 'Event Host'}</span>
                                        </div>
                                    </Link>

                                    {hostOrg && (
                                        <>
                                            <div className="w-px h-8 bg-zinc-200 hidden md:block"></div>
                                            <Link href={`/organizations/${hostOrg.id}`} className="flex items-center gap-3 group">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center overflow-hidden border border-amber-200 group-hover:border-amber-400 transition-colors">
                                                    {hostOrg.logo_url && <img src={hostOrg.logo_url} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Organization</span>
                                                    <span className="font-bold text-zinc-900 group-hover:underline">{hostOrg.name}</span>
                                                </div>
                                            </Link>
                                        </>
                                    )}
                                </div>

                                {/* Date/Location/Duration Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-start gap-4 bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-sky-200 flex items-center justify-center text-sky-600 shadow-sm shrink-0">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            {/* <h4 className="text-sm font-bold text-sky-900 uppercase">Date & Time</h4> */}
                                            <p className="text-sky-800 text-sm mt-1 font-medium">
                                                {dateLine}
                                            </p>
                                            <p className="text-sky-600 text-xs mt-0.5">
                                                {timeLine}
                                            </p>
                                            {/* Duration */}
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            {/* <h4 className="text-sm font-bold text-emerald-900 uppercase">{event.type === 'online' ? 'Online Event' : 'Location'}</h4> */}
                                            <p className="text-emerald-800 text-sm mt-1 font-medium">
                                                {event.venue_remark || event.venue_name || 'TBC'}
                                            </p>
                                            <div className="text-emerald-600 text-xs mt-0.5 line-clamp-1">
                                                {event.type === 'online' ? (
                                                    isParticipant && event.meeting_url ? (
                                                        <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-800 font-bold">
                                                            {event.meeting_url}
                                                        </a>
                                                    ) : (
                                                        <span>TBC</span>
                                                    )
                                                ) : (
                                                    <span>{venueAddress || event.location || event.venue_name || 'TBC'}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h2 className="text-xl font-black text-zinc-900 mb-6 flex items-center gap-3">
                                About This Event
                            </h2>
                            <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm">
                                <div className="prose prose-lg prose-zinc max-w-none text-zinc-600 leading-loose">
                                    {event.description ? (
                                        <div className="whitespace-pre-wrap">{event.description}</div>
                                    ) : (
                                        <p className="italic text-zinc-400">No description provided.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Map Section */}
                        {event.venue_place_id && event.type !== 'online' && (
                            <div id="map-section">
                                <h2 className="text-xl font-black text-zinc-900 mb-6">Venue Map</h2>
                                <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-zinc-200 shadow-sm relative">
                                    {isLoaded && mapCenter ? (
                                        <GoogleMap
                                            mapContainerStyle={{ width: '100%', height: '100%' }}
                                            center={mapCenter}
                                            zoom={15}
                                        >
                                            <Marker position={mapCenter} />
                                        </GoogleMap>
                                    ) : mapError ? (
                                        <div className="w-full h-full bg-zinc-50 flex items-center justify-center text-zinc-400 font-medium">
                                            Location TBD
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-zinc-50 flex items-center justify-center text-zinc-400">Loading Map...</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Reviews Section - Only for Post Event */}
                        {currentPhase === EventPhase.POST_EVENT && (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-xl font-black text-zinc-900">Reviews</h2>
                                        {reviews.length > 0 && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-full border border-yellow-100">
                                                <span className="text-lg font-black text-yellow-600">{reviewsAvg}</span>
                                                <div className="flex text-yellow-400">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <svg key={i} className={`w-4 h-4 ${i < Math.round(reviewsAvg) ? 'fill-current' : 'text-zinc-200 fill-current'}`} viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    ))}
                                                </div>
                                                <span className="text-xs font-bold text-yellow-600/60">({reviewsCount})</span>
                                            </div>
                                        )}
                                    </div>
                                    {isParticipant && participantStatus === 'attended' && !isOrganizer && (
                                        <button
                                            onClick={() => setShowReviewModal(true)}
                                            className="px-4 py-2 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                        >
                                            Write a Review
                                        </button>
                                    )}
                                </div>
                                {reviews.length === 0 ? (
                                    <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 text-zinc-500">
                                        No reviews available yet.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {reviews.map(r => (
                                            <div key={r.id} className="p-6 bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-4">
                                                {/* Reviewer Info */}
                                                <div className="flex items-center gap-3">
                                                    {r.is_anonymous ? (
                                                        <div className="shrink-0">
                                                            <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden border border-zinc-100 flex items-center justify-center">
                                                                <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-sm">
                                                                    A
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Link href={`/profile/${r.reviewer_id}`} className="shrink-0 group">
                                                            <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden border border-zinc-100 group-hover:border-zinc-300 transition-colors">
                                                                {r.reviewer_avatar ? (
                                                                    <img src={r.reviewer_avatar} alt={r.reviewer_name || 'Reviewer'} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-sm">
                                                                        {(r.reviewer_name || 'U').charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Link>
                                                    )}

                                                    <div className="flex flex-col">
                                                        {r.is_anonymous ? (
                                                            <span className="font-bold text-sm text-zinc-900 cursor-default">
                                                                {r.reviewer_name || 'Anonymous'}
                                                            </span>
                                                        ) : (
                                                            <Link href={`/profile/${r.reviewer_id}`} className="font-bold text-sm text-zinc-900 hover:underline">
                                                                {r.reviewer_name || 'Anonymous User'}
                                                            </Link>
                                                        )}
                                                        <span className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                {/* Rating & Content */}
                                                <div>
                                                    <div className="flex text-yellow-500 mb-2">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <svg key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-current' : 'text-zinc-200 fill-current'}`} viewBox="0 0 20 20">
                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                            </svg>
                                                        ))}
                                                    </div>
                                                    <p className="text-zinc-700 leading-relaxed">{r.comment}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* --- RIGHT COLUMN (Sticky Sidebar) --- */}
                    <div className="lg:col-span-4 relative">
                        <div className="sticky top-24 space-y-6">

                            {/* 1. Main Action Card */}
                            <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden p-6 relative">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-70 pointer-events-none"></div>

                                <div className="relative z-10">
                                    {event.registration_type === 'paid' && !isParticipant && (
                                        <div className="mb-6">
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Ticket Price</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-black text-zinc-900">RM {event.price?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    {isOrganizer || isCommittee ? (
                                        <Link
                                            href={`/manage/${event.id}`}
                                            className="block w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-center text-lg hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                                        >
                                            {isOrganizer ? 'Manage Event' : 'Committee Dashboard'}
                                        </Link>
                                    ) : (
                                        <div className="space-y-4">
                                            {isParticipant || isSpeaker || isSponsor ? (
                                                participantStatus === 'attended' ? (
                                                    <div className="space-y-4">
                                                        <div className="w-full py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-bold text-center text-lg border border-emerald-200">
                                                            Attended
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 mb-4">
                                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-emerald-800">You are going!</p>
                                                                <p className="text-xs text-emerald-600">
                                                                    {myRole === 'speaker' ? 'Speaker' :
                                                                        myRole === 'sponsor' ? 'Sponsor' :
                                                                            participantStatus === 'attended' ? 'Attendance marked' : 'Ticket confirmed'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {event.type === 'online' && (
                                                            event.meeting_url ? (
                                                                <a
                                                                    href={event.meeting_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`w-full py-4 rounded-xl font-bold text-center text-lg shadow-lg mb-4 flex items-center justify-center gap-2 transition-all ${(new Date().getTime() >= new Date(event.start_datetime).getTime() - 30 * 60 * 1000) && (new Date() < new Date(event.end_datetime))
                                                                        ? 'bg-violet-600 text-white hover:bg-violet-700 hover:-translate-y-1 hover:shadow-xl animate-pulse'
                                                                        : 'bg-zinc-100 text-zinc-400 cursor-not-allowed pointer-events-none'
                                                                        }`}
                                                                >
                                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                    </svg>
                                                                    {(new Date().getTime() >= new Date(event.start_datetime).getTime() - 30 * 60 * 1000)
                                                                        ? 'Join Meeting Now'
                                                                        : 'Meeting Link Available 30m Before'}
                                                                </a>
                                                            ) : (
                                                                <div className="w-full py-4 bg-zinc-100 text-zinc-400 rounded-2xl font-bold text-center text-lg shadow-sm mb-4 border border-zinc-200">
                                                                    Meeting Link Pending
                                                                </div>
                                                            )
                                                        )}
                                                        {isJoinedAccepted && event.type !== 'online' && (
                                                            <button
                                                                onClick={() => setShowQRModal(true)}
                                                                disabled={!isAttendanceOpen || !event.is_attendance_enabled}
                                                                className={`w-full py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all mb-4 ${isAttendanceOpen && event.is_attendance_enabled
                                                                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                                                                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                                                    }`}
                                                            >
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                                                {isAttendanceOpen && event.is_attendance_enabled ? 'Show Attendance QR' : !event.is_attendance_enabled ? 'Attendance Disabled' : 'QR Available 24h Before Event'}
                                                            </button>
                                                        )}
                                                        {currentPhase !== EventPhase.POST_EVENT && (
                                                            <button
                                                                onClick={handleLeaveClick}
                                                                disabled={registering}
                                                                className="w-full py-2 text-zinc-400 text-xs font-bold hover:text-red-500 transition-colors disabled:opacity-50"
                                                            >
                                                                {registering ? 'Processing...' : 'Cancel Registration'}
                                                            </button>
                                                        )}
                                                    </>
                                                )
                                            ) : isRegistered && participantStatus === 'pending' ? (
                                                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-yellow-800 space-y-3">
                                                    <p className="text-sm font-bold">
                                                        {event.registration_type === 'paid'
                                                            ? (paymentStatus === 'pending'
                                                                ? 'Payment under review. Waiting organizer approval.'
                                                                : paymentStatus === 'rejected'
                                                                    ? 'Payment rejected. Please upload a valid receipt.'
                                                                    : 'Settle the payment and verified by organizer first.')
                                                            : 'Waiting organizer approval'}
                                                    </p>
                                                    {event.registration_type === 'paid' && (
                                                        <div>
                                                            <input
                                                                type="file"
                                                                ref={fileInputRef}
                                                                className="hidden"
                                                                accept="image/*,.pdf"
                                                                onChange={handleUploadProof}
                                                            />
                                                            <button
                                                                onClick={() => fileInputRef.current?.click()}
                                                                disabled={uploadingProof || paymentStatus === 'pending'}
                                                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors w-full border ${paymentStatus === 'pending'
                                                                    ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                                                                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200'
                                                                    }`}
                                                            >
                                                                {uploadingProof ? 'Uploading...' : paymentStatus === 'pending' ? 'Proof Uploaded' : 'Upload Receipt'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : isRegistered && participantStatus === 'rejected' ? (
                                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
                                                    <p className="text-sm font-bold">Your registration has been rejected. Please contact organizer.</p>
                                                </div>
                                            ) : isFull ? (
                                                <div className="w-full py-4 bg-zinc-100 text-zinc-400 rounded-2xl font-bold text-center text-lg cursor-not-allowed border border-zinc-200">
                                                    Event Full
                                                </div>
                                            ) : currentPhase === EventPhase.POST_EVENT ? (
                                                <div className="w-full py-4 bg-zinc-100 text-zinc-500 rounded-2xl font-bold text-center text-lg border border-zinc-200">
                                                    Event Ended
                                                </div>
                                            ) : hasEventStarted ? (
                                                <div className="space-y-3">
                                                    <div className="w-full py-4 bg-zinc-100 text-zinc-500 rounded-2xl font-bold text-center text-lg border border-zinc-200">
                                                        Event Ongoing
                                                    </div>
                                                    {event.type !== 'online' ? (
                                                        <div className="w-full py-3 bg-zinc-50 text-zinc-400 rounded-xl font-bold text-center text-sm cursor-not-allowed border border-zinc-100">
                                                            Walk-in is restricted. Request organizer-issued link.
                                                        </div>
                                                    ) : (
                                                        <button
                                                            disabled
                                                            className="w-full py-3 bg-zinc-50 text-zinc-400 rounded-xl font-bold text-sm cursor-not-allowed border border-zinc-100"
                                                        >
                                                            Contact Organizer to Join
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={handleJoin}
                                                    disabled={registering || !isRegistrationOpen}
                                                    className="block w-full py-4 bg-yellow-400 text-zinc-900 rounded-2xl font-bold text-center text-lg hover:bg-yellow-300 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
                                                >
                                                    {registering ? 'Registering...' : isRegistrationOpen ? 'Join' : 'Registration Closed'}
                                                </button>
                                            )}


                                            {/* Expert / Sponsor Buttons */}
                                            {user && !isRegistered && !isOrganizer && myRole !== 'speaker' && myRole !== 'sponsor' && user.roles.some(r => ['expert', 'expert_pending', 'sponsor', 'sponsor_pending'].includes(r as string)) && (
                                                <div className="flex gap-2 pt-2">
                                                    {(user.roles.includes('expert') || user.roles.includes('expert_pending')) && (
                                                        <button
                                                            onClick={() => handleContactOrganizer('expert')}
                                                            className="flex-1 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-bold text-center text-sm hover:bg-zinc-50 transition-colors shadow-sm"
                                                        >
                                                            Apply as Speaker
                                                        </button>
                                                    )}
                                                    {(user.roles.includes('sponsor') || user.roles.includes('sponsor_pending')) && (
                                                        <button
                                                            onClick={() => handleContactOrganizer('sponsor')}
                                                            className="flex-1 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-bold text-center text-sm hover:bg-zinc-50 transition-colors shadow-sm"
                                                        >
                                                            Sponsor Event
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* What to Prepare - Re-styled & Moved to Sidebar */}
                            {isJoinedAccepted && currentPhase !== EventPhase.POST_EVENT && (
                                <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 shadow-sm relative overflow-hidden group">
                                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-100 rounded-full blur-xl opacity-60 group-hover:scale-110 transition-transform"></div>
                                    <h3 className="text-sm font-black text-amber-900 uppercase tracking-wide mb-4 flex items-center gap-2 relative z-10">
                                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        What to Prepare
                                    </h3>
                                    {externalChecklist.length === 0 ? (
                                        <div className="text-center py-4 bg-white/50 rounded-xl border border-amber-100/50">
                                            <p className="text-sm text-amber-800 italic">No specific preparations listed.</p>
                                        </div>
                                    ) : (
                                        <ul className="space-y-4 relative z-10 mb-6">
                                            {externalChecklist.map((item, index) => (
                                                <li key={item.id} className="flex gap-3 text-amber-900 group/item">
                                                    <div className="w-6 h-6 rounded-lg bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-sm font-bold text-xs text-amber-700">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 pt-0.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-bold leading-tight">{item.title}</span>
                                                            {item.link_url && (
                                                                <button
                                                                    onClick={() => setPreviewResource({ title: item.title, url: item.link_url! })}
                                                                    className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors flex items-center gap-1"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                    Preview
                                                                </button>
                                                            )}
                                                            {item.files && item.files.length > 0 && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {item.files.map(file => (
                                                                        <a
                                                                            key={file.id}
                                                                            href={file.file_url || '#'}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors flex items-center gap-1"
                                                                        >
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                                            {file.title || 'File'}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {item.description && (
                                                            <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">{item.description}</p>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {participantStatus !== 'attended' && (
                                        <div className="relative z-10">
                                            {myReminder ? (
                                                <button
                                                    onClick={handleReminderClick}
                                                    className="w-full py-3 bg-amber-100 border border-amber-200 text-amber-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-200 transition-colors cursor-pointer"
                                                >
                                                    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Reminder: {myReminder.option === 'one_day' ? '1 Day Before' : myReminder.option === 'three_days' ? '3 Days Before' : '1 Week Before'}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleReminderClick}
                                                    disabled={reminding}
                                                    className="w-full py-2 bg-white border border-amber-200 text-amber-800 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors shadow-sm"
                                                >
                                                    Set Reminder
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Payment QR Box */}
                            {isRegistered && event.payment_qr_url && participantStatus !== 'attended' && currentPhase !== EventPhase.POST_EVENT && (
                                <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide mb-4">Payment</h3>
                                    <div className="bg-zinc-50 p-4 rounded-xl flex flex-col items-center border border-zinc-100 group">
                                        <img
                                            src={event.payment_qr_url}
                                            alt="Payment QR"
                                            className="max-w-[240px] border border-zinc-200 rounded-lg mb-3 transition-transform duration-200 group-hover:scale-105 cursor-pointer"
                                            onClick={() => setShowPaymentQRModal(true)}
                                        />
                                        <p className="text-xs text-zinc-500 text-center">Scan to pay</p>
                                        <button
                                            onClick={() => setShowPaymentQRModal(true)}
                                            className="mt-4 w-full py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-transform hover:scale-[1.02] shadow-md"
                                        >
                                            Open Payment QR
                                        </button>
                                    </div>
                                    {paymentStatus === 'rejected' && (
                                        <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-100 text-center">
                                            Payment Rejected.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Featured Partners */}
                            {participants.some(p => p.role === 'sponsor') && (
                                <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Featured Partners</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {participants
                                            .filter(p => p.role === 'sponsor')
                                            .map(sponsor => (
                                                <a
                                                    key={sponsor.id}
                                                    href={sponsor.promo_link || '#'}
                                                    target={sponsor.promo_link ? "_blank" : "_self"}
                                                    rel="noopener noreferrer"
                                                    className={`block group relative ${!sponsor.promo_link ? 'pointer-events-none' : 'cursor-pointer hover:-translate-y-1 transition-transform'}`}
                                                >
                                                    {sponsor.promo_image_url ? (
                                                        <div className="aspect-[3/2] bg-white rounded-xl border border-zinc-100 overflow-hidden flex items-center justify-center p-2 shadow-sm group-hover:shadow-md transition-all">
                                                            <img src={sponsor.promo_image_url} alt={sponsor.name || 'Sponsor'} className="w-full h-full object-contain" />
                                                        </div>
                                                    ) : (
                                                        <div className="aspect-[3/2] bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-center p-2 text-center shadow-sm">
                                                            <span className="text-xs font-bold text-zinc-600 break-words w-full">{sponsor.name || sponsor.email?.split('@')[0] || 'Sponsor'}</span>
                                                        </div>
                                                    )}
                                                </a>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Share & Socials */}
                            <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm space-y-6">
                                <div>
                                    <div className="flex justify-between items-end mb-4">
                                        <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest">Share this event</h3>
                                        {(event.participant_count !== undefined || stats) && (
                                            <button
                                                onClick={() => setShowParticipantsModal(true)}
                                                className="text-right flex flex-col items-end justify-center group"
                                            >
                                                <p className="text-xl font-black text-violet-900 leading-none mb-0.5 group-hover:text-violet-700 transition-colors">
                                                    {event.participant_count ?? stats?.total_participants ?? 0}
                                                    {event.max_participant && <span className="text-lg text-violet-400"> / {event.max_participant}</span>}
                                                </p>
                                                <p className="text-xs font-bold text-violet-500 uppercase group-hover:underline">
                                                    Joined
                                                </p>
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={handleShare} className="flex-1 py-2 rounded-xl bg-white border border-violet-100 text-violet-600 font-bold text-sm hover:bg-violet-100 transition-all flex items-center justify-center gap-2 shadow-sm" title="Copy Link">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                        </button>
                                        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${typeof window !== 'undefined' ? window.location.href : ''}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 rounded-xl bg-white border border-violet-100 text-sky-500 hover:bg-sky-50 transition-all flex items-center justify-center shadow-sm" title="Twitter">
                                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                                        </a>
                                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${typeof window !== 'undefined' ? window.location.href : ''}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 rounded-xl bg-white border border-violet-100 text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center shadow-sm" title="Facebook">
                                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                        </a>
                                        <a href={`whatsapp://send?text=${encodeURIComponent(event.title + ' ' + (typeof window !== 'undefined' ? window.location.href : ''))}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 rounded-xl bg-white border border-violet-100 text-green-600 hover:bg-green-50 transition-all flex items-center justify-center shadow-sm" title="WhatsApp">
                                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                        </a>
                                    </div>
                                </div>

                                {friendsGoing.length > 0 && (
                                    <div className="pt-4 border-t border-zinc-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Friends Going</h4>
                                            <button
                                                onClick={() => setShowParticipantsModal(true)}
                                                className="text-xs text-violet-600 font-bold hover:underline"
                                            >
                                                See All
                                            </button>
                                        </div>
                                        <div className="flex items-center -space-x-3">
                                            {friendsGoing.slice(0, 5).map((friend) => (
                                                <Link
                                                    key={friend.id}
                                                    href={`/profile/${friend.user_id}`}
                                                    className="w-10 h-10 rounded-full border-2 border-white bg-zinc-100 overflow-hidden hover:scale-110 hover:z-10 transition-all relative"
                                                    title={friend.user_full_name || friend.name || 'Friend'}
                                                >
                                                    {friend.user_avatar ? (
                                                        <img src={friend.user_avatar} alt={friend.user_full_name || 'Friend'} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                                                            {(friend.user_full_name || friend.name || '?').charAt(0)}
                                                        </div>
                                                    )}
                                                </Link>
                                            ))}
                                            {friendsGoing.length > 5 && (
                                                <button
                                                    onClick={() => setShowParticipantsModal(true)}
                                                    className="w-10 h-10 rounded-full border-2 border-white bg-violet-50 flex items-center justify-center text-xs font-bold text-violet-600 hover:bg-violet-100 transition-colors z-0"
                                                >
                                                    +{friendsGoing.length - 5}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>

            </div>

            {/* Attendance QR Modal */}
            {event && (
                <>
                    <AttendanceQRModal
                        eventId={event.id}
                        eventTitle={event.title}
                        eventEndTime={event.end_datetime}
                        isOpen={showQRModal}
                        onClose={() => setShowQRModal(false)}
                    />

                    <ConfirmationModal
                        isOpen={showLeaveModal}
                        onClose={() => setShowLeaveModal(false)}
                        onConfirm={confirmLeave}
                        title="Cancel Registration"
                        message="Are you sure you want to cancel your registration? You will lose your spot in this event."
                        confirmText="Yes, Cancel"
                        variant="danger"
                        isLoading={registering}
                    />

                    <ReminderModal
                        isOpen={showReminderModal}
                        onClose={() => setShowReminderModal(false)}
                        onConfirm={confirmReminder}
                        currentReminderId={myReminder?.option}
                        isLoading={reminding}
                        eventTitle={event.title}
                        eventStart={event.start_datetime}
                        eventEnd={event.end_datetime}
                        eventDescription={event.description || ''}
                        eventLocation={event.location || event.venue_name || ''}
                    />

                    <ParticipantsModal
                        isOpen={showParticipantsModal}
                        onClose={() => setShowParticipantsModal(false)}
                        eventId={event.id}
                        eventTitle={event.title}
                    />

                    <EventReviewModal
                        isOpen={showReviewModal}
                        onClose={() => setShowReviewModal(false)}
                        eventId={event.id}
                        eventTitle={event.title}
                        organizerId={event.organizer_id}
                        onSuccess={fetchData}
                    />
                </>
            )}

            {/* Image Preview Modal */}
            {showImageModal && event && event.cover_url && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setShowImageModal(false)}
                >
                    <div className="relative max-w-7xl max-h-screen w-full h-full flex items-center justify-center">
                        <img
                            src={event.cover_url}
                            alt={event.title}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                        <button
                            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                            onClick={() => setShowImageModal(false)}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            {showPaymentQRModal && event && event.payment_qr_url && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => setShowPaymentQRModal(false)}
                >
                    <div className="relative max-w-3xl w-full flex items-center justify-center">
                        <img
                            src={event.payment_qr_url}
                            alt="Payment QR"
                            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl bg-white p-4"
                        />
                        <button
                            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                            onClick={() => setShowPaymentQRModal(false)}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Resource Preview Modal */}
            <ResourcePreviewModal
                isOpen={!!previewResource}
                resource={previewResource}
                onClose={() => setPreviewResource(null)}
            />
        </div>
    )
}
