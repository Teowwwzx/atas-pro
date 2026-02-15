"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Toaster, toast } from 'react-hot-toast'
import { getEventById, getEventParticipants, respondInvitationMe, getMe } from '@/services/api'
import { EventDetails, UserMeResponse, EventParticipantDetails } from '@/services/api.types'
import { format } from 'date-fns'

export default function RequestDetailsPage() {
    const params = useParams()
    const router = useRouter()
    // Assuming [id] is the event_id for now, as that's how we track invitations
    const eventId = params.id as string

    const [event, setEvent] = useState<EventDetails | null>(null)
    const [myParticipant, setMyParticipant] = useState<EventParticipantDetails | null>(null)
    const [organizer, setOrganizer] = useState<EventParticipantDetails | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [evt, parts, me] = await Promise.all([
                    getEventById(eventId),
                    getEventParticipants(eventId),
                    getMe()
                ])
                setEvent(evt)

                // Find me
                const foundMe = parts.find(p => p.user_id === me.id)
                setMyParticipant(foundMe || null)

                // Find organizer
                const foundOrg = parts.find(p => p.role === 'organizer')
                setOrganizer(foundOrg || null)

            } catch (error) {
                console.error(error)
                toast.error('Failed to load request details')
            } finally {
                setLoading(false)
            }
        }
        if (eventId) fetchData()
    }, [eventId])

    const handleResponse = async (status: 'accepted' | 'rejected') => {
        try {
            await respondInvitationMe(eventId, { status })
            toast.success(`Request ${status}`)
            router.push('/main/dashboard') // Redirect after action
        } catch (error) {
            console.error(error)
            toast.error('Failed to process request')
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>
    if (!event || !myParticipant) return <div className="flex h-screen items-center justify-center">Request not found</div>

    const startDate = new Date(event.start_datetime)
    const endDate = new Date(event.end_datetime)
    const durationMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
    const durationHrs = Math.floor(durationMins / 60)
    const durationRemainingMins = durationMins % 60
    const durationString = `${durationHrs > 0 ? `${durationHrs} Hour ` : ''}${durationRemainingMins > 0 ? `${durationRemainingMins} Mins` : ''}`

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-slate-800">
            <Toaster />

            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Link */}
                <Link href="/dashboard" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Dashboard
                </Link>

                {/* Title Section */}
                <div className="flex justify-between items-end">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Request Details</h1>
                    <span className="text-slate-400 font-mono text-sm">#REQ-{eventId.slice(0, 8).toUpperCase()}</span>
                </div>

                {/* Banner - Only show if pending */}
                {myParticipant.status === 'pending' && (
                    <div className="bg-slate-900 text-white rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-800 rounded-full">
                                <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <p className="font-bold text-lg">Action Required</p>
                                <p className="text-slate-300 text-sm">Please review and accept or decline this request.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={() => handleResponse('rejected')}
                                className="px-6 py-2.5 rounded-lg border border-slate-600 hover:bg-slate-800 transition-colors font-semibold text-sm w-full md:w-auto"
                            >
                                ✕ Decline
                            </button>
                            <button
                                onClick={() => handleResponse('accepted')}
                                className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors font-bold text-sm flex items-center justify-center gap-2 w-full md:w-auto shadow-lg shadow-emerald-500/20"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                Accept Request
                            </button>
                        </div>
                    </div>
                )}


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Card */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">

                            {/* Requestor Profile */}
                            <div className="flex items-center gap-4 border-b border-slate-100 pb-8 mb-8">
                                <img
                                    src={`https://placehold.co/128x128/png?text=${encodeURIComponent(organizer?.user_id || 'Organizer')}`}
                                    alt="Profile"
                                    className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md"
                                />
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Request From</p>
                                    <h3 className="text-xl font-bold text-slate-900">{organizer?.user_id || 'Unknown Organizer'}</h3>
                                    <p className="text-slate-500 text-sm flex items-center gap-2">
                                        Organizer @ {event.organizer_id}
                                        {/* Mock Rating */}
                                        <span className="flex items-center text-amber-500 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-full">
                                            4.8 ★
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Event Topic */}
                            <div className="mb-8">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Event Topic</p>
                                <h2 className="text-3xl font-black text-slate-900 leading-tight">{event.title}</h2>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Proposed Date</p>
                                    <div className="flex items-center gap-3 text-slate-700 font-medium">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        {format(startDate, 'EEE, MMM d • h:mm a')}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Venue</p>
                                    <div className="flex items-center gap-3 text-slate-700 font-medium">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {event.venue_remark || 'TBA'}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Duration</p>
                                    <div className="flex items-center gap-3 text-slate-700 font-medium">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {durationString}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Est. Audience</p>
                                    <div className="flex items-center gap-3 text-slate-700 font-medium">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                        ~{event.max_participant || 50} Students
                                    </div>
                                </div>
                            </div>

                            {/* Invitation Message */}
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4">Invitation Message</p>
                                <div className="text-slate-600 leading-relaxed whitespace-pre-wrap font-serif text-lg italic">
                                    &quot;{myParticipant.description || event.description}&quot;
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col min-h-[500px]">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                    Communication Log
                                </h3>
                                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    Official Record
                                </span>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-b-3xl">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-400">
                                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                                <h4 className="font-bold text-slate-900 text-lg mb-2">Chat Locked</h4>
                                <p className="text-slate-500 text-sm max-w-[250px]">
                                    Accept this booking to unlock the communication log and discuss details with {organizer?.user_id || 'the organizer'}.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
