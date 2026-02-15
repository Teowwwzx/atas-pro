'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventById, getMe, getMyEvents, getMyProfile, publishEvent, unpublishEvent, getEventAttendanceStats, getMyReview } from '@/services/api'
import { EventDetails, ProfileResponse, UserMeResponse, EventAttendanceStats } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import Link from 'next/link'
import { DashboardHeroCard } from '../../dashboard/DashboardHeroCard'
import { DashboardTabs } from '../../dashboard/DashboardTabs'
import { EventPreviewModal } from '../../dashboard/EventPreviewModal'
import { EventReviewModal } from '@/components/event/EventReviewModal'
import { getEventPhase, EventPhase } from '@/lib/eventPhases'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { EventCheckInQRModal } from '../../dashboard/EventCheckInQRModal'

function ManageEventContent() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string

    const [loading, setLoading] = useState(true)
    const [event, setEvent] = useState<EventDetails | null>(null)
    const [user, setUser] = useState<ProfileResponse | null>(null) // This might need to be fetched if used in tabs
    const [me, setMe] = useState<UserMeResponse | null>(null)
    const [role, setRole] = useState<string | null>(null)
    const [currentPhase, setCurrentPhase] = useState<EventPhase>(EventPhase.DRAFT)
    const [attendanceStats, setAttendanceStats] = useState<EventAttendanceStats | null>(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [showPublishModal, setShowPublishModal] = useState(false)
    const [showUnpublishModal, setShowUnpublishModal] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [showCheckInQR, setShowCheckInQR] = useState(false)

    // Review State (Post-Event Only)
    const [isReviewOpen, setIsReviewOpen] = useState(false)
    const [hasReviewed, setHasReviewed] = useState(false)
    const [checkingReview, setCheckingReview] = useState(false)

    useEffect(() => {
        if (id) {
            checkAccessAndLoad()
        }
    }, [id])

    const checkAccessAndLoad = async () => {
        try {
            // 1. Get current user and my events to verify role
            const [meData, profileData, myEvents] = await Promise.all([
                getMe(),
                getMyProfile(),
                getMyEvents()
            ])
            setMe(meData)
            setUser(profileData)

            // 2. Find role for this event
            const myEvent = myEvents.find(e => e.event_id === id)
            const myRole = myEvent?.my_role

            // 3. Security Check
            const authorizedRoles = ['organizer', 'committee', 'speaker', 'sponsor']
            if (!myRole || !authorizedRoles.includes(myRole)) {
                toast.error('Access Denied: You are not a manager for this event')
                router.replace(`/events/${id}`)
                return
            }

            setRole(myRole)

            // 4. Load full event details
            const fullEvent = await getEventById(id)
            setEvent(fullEvent)

            // 5. Calculate Phase
            const phase = getEventPhase(fullEvent)
            setCurrentPhase(phase)

            // 6. Fetch stats if relevant
            if (myRole === 'organizer' || myRole === 'committee') {
                try {
                    const stats = await getEventAttendanceStats(id)
                    setAttendanceStats(stats)
                } catch { } // Ignore if no stats
            }

            // 7. Check Review Status (Only if Post-Event and NOT organizer)
            // Organizers don't review their own events usually, but if enabled in backend, we can allow.
            // Requirement says: "Review tab is for past event only"
            // Usually organizers *manage* reviews, participants *write* them. 
            // But if specific requirement to write, we check here.
            // For now, let's assume this page is for MANAGEMENT. 
            // If the "Reviews" tab in DashboardTabs is for SEEING reviews, that's fine.

        } catch (error) {
            console.error(error)
            toast.error('Failed to load event')
            router.push('/dashboard')
        } finally {
            setLoading(false)
        }
    }

    const refreshData = () => {
        checkAccessAndLoad()
    }

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
                <Skeleton height="400px" className="rounded-[2.5rem]" />
            </div>
        )
    }

    if (!event) return null

    return (
        <div className="w-full max-w-[95%] 2xl:max-w-screen-2xl mx-auto px-4 py-8 animate-fadeIn">
            {/* Header / Back */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 w-full animate-fadeIn">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="mb-4 text-sm font-bold text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Dashboard
                </button>

                {/* Management Actions */}
                <div className="flex items-center gap-3">
                    {/* Event Day / Ongoing Actions */}
                    {(currentPhase === EventPhase.EVENT_DAY || currentPhase === EventPhase.ONGOING) ? (
                        <>
                            {attendanceStats && (
                                <div className="px-6 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="text-sm">
                                                <span className="font-black text-green-700 text-lg">{attendanceStats.attended_total}</span>
                                                <span className="text-zinc-500 font-medium mx-1">/</span>
                                                <span className="font-bold text-zinc-700">{attendanceStats.total_participants}</span>
                                            </div>
                                        </div>
                                        <div className="text-xs font-bold text-green-700 uppercase tracking-wider">
                                            Attended
                                        </div>
                                    </div>
                                </div>
                            )}
                            {event.type === 'online' ? (
                                <button
                                    className={`px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 ${(currentPhase === EventPhase.EVENT_DAY || currentPhase === EventPhase.ONGOING) && event.is_attendance_enabled
                                            ? 'hover:from-blue-700 hover:to-cyan-700 hover:shadow-xl'
                                            : 'opacity-50 cursor-not-allowed grayscale'
                                        }`}
                                    onClick={(e) => {
                                        if (currentPhase !== EventPhase.EVENT_DAY && currentPhase !== EventPhase.ONGOING) {
                                            e.preventDefault()
                                            toast.error('Attendance is only available 24 hours before and during the event.')
                                        } else if (!event.is_attendance_enabled) {
                                            e.preventDefault()
                                            toast.error('Attendance is currently disabled for this event.')
                                        } else {
                                            setShowCheckInQR(true)
                                        }
                                    }}
                                    title="Show attendance"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                    Show attendance
                                </button>
                            ) : (
                                <Link
                                    href={`/attendance/scan?eventId=${event.id}`}
                                    className={`px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 ${(currentPhase === EventPhase.EVENT_DAY || currentPhase === EventPhase.ONGOING) && event.is_attendance_enabled
                                            ? 'hover:from-blue-700 hover:to-cyan-700 hover:shadow-xl'
                                            : 'opacity-50 cursor-not-allowed grayscale'
                                        }`}
                                    onClick={(e) => {
                                        if (currentPhase !== EventPhase.EVENT_DAY && currentPhase !== EventPhase.ONGOING) {
                                            e.preventDefault()
                                            toast.error('Attendance scanning is only available 24 hours before and during the event.')
                                        } else if (!event.is_attendance_enabled) {
                                            e.preventDefault()
                                            toast.error('Attendance is currently disabled for this event.')
                                        }
                                    }}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                    Scan Attendance
                                </Link>
                            )}
                        </>
                    ) : currentPhase === EventPhase.POST_EVENT ? (
                        <div className="px-6 py-2.5 bg-zinc-100 border-2 border-zinc-300 rounded-xl">
                            <div className="text-sm font-bold text-zinc-700">
                                ✅ Event Completed
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Draft / Pre-Event Actions */}
                            <button
                                onClick={() => setIsPreviewOpen(true)}
                                className="px-6 py-2.5 bg-white border-2 border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm"
                            >
                                Preview
                            </button>
                            {(role === 'organizer' || role === 'committee') && (
                                <button
                                    onClick={async () => {
                                        if (event.status === 'published') {
                                            setShowUnpublishModal(true)
                                        } else {
                                            setShowPublishModal(true)
                                        }
                                    }}
                                    className="px-6 py-2.5 bg-zinc-900 text-yellow-400 font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    {event.status === 'published' ? 'Unpublish' : 'Publish'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Event Hero */}
            <DashboardHeroCard
                event={event}
                onPreview={() => setIsPreviewOpen(true)}
                canEditCover={role === 'organizer' || role === 'committee'}
                phase={currentPhase}
                onCoverUpdated={refreshData}
            />

            {/* Tabs */}
            <DashboardTabs
                event={event}
                user={user} // Note: This might be null if we didn't fetch full profile. But DashboardTabs handles it?
                // DashboardTabs uses `user: ProfileResponse | null`. In dashboard/page.tsx it passed `user` (state).
                // Here we haven't fetched profile, only `me`. 
                // `user` in dashboard page was from `getProfile()`. We should probably fetch it if needed.
                role={role}
                phase={currentPhase}
                onUpdate={refreshData}
                onDelete={() => router.push('/dashboard')}
            />

            <EventPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                event={event}
            />
            <PublishModal
                open={showPublishModal}
                onClose={() => setShowPublishModal(false)}
                onConfirm={async () => {
                    setPublishing(true)
                    try {
                        await publishEvent(event.id)
                        toast.success('Event Published!')
                        setShowPublishModal(false)
                        refreshData()
                    } catch (e) {
                        toast.error('Failed to publish event')
                    } finally {
                        setPublishing(false)
                    }
                }}
                loading={publishing}
            />
            <UnpublishModal
                open={showUnpublishModal}
                onClose={() => setShowUnpublishModal(false)}
                onConfirm={async () => {
                    setPublishing(true)
                    try {
                        await unpublishEvent(event.id)
                        toast.success('Event Unpublished')
                        setShowUnpublishModal(false)
                        refreshData()
                    } catch (e) {
                        toast.error('Failed to unpublish event')
                    } finally {
                        setPublishing(false)
                    }
                }}
                loading={publishing}
            />
            <EventCheckInQRModal
                isOpen={showCheckInQR}
                onClose={() => setShowCheckInQR(false)}
                eventTitle={event.title}
                checkInUrl={typeof window !== 'undefined' ? `${window.location.origin}/checkin/${event.id}` : ''}
            />
        </div>
    )
}

function PublishModal({ open, onClose, onConfirm, loading }: { open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean }) {
    return (
        <ConfirmationModal
            isOpen={open}
            onClose={onClose}
            onConfirm={onConfirm}
            title="Publish Event"
            message="Are you ready to publish this event? It will be visible on Discover."
            confirmText="Publish"
            variant="primary"
            isLoading={loading}
        />
    )
}
function UnpublishModal({ open, onClose, onConfirm, loading }: { open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean }) {
    return (
        <ConfirmationModal
            isOpen={open}
            onClose={onClose}
            onConfirm={onConfirm}
            title="Unpublish Event"
            message="Unpublish this event? It will be hidden from Discover."
            confirmText="Unpublish"
            variant="danger"
            isLoading={loading}
        />
    )
}

export default function ManageEventPage() {
    return (
        <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-12"><Skeleton height="400px" className="rounded-[2.5rem]" /></div>}>
            <ManageEventContent />
        </Suspense>
    )
}
