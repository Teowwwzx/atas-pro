'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { selfCheckIn, getEventById } from '@/services/api'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export default function EventCheckInPage() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('')
    const [eventTitle, setEventTitle] = useState('')

    useEffect(() => {
        if (!id) return

        const performCheckIn = async () => {
            try {
                // Fetch event details first or parallel
                const event = await getEventById(id)
                setEventTitle(event.title)

                const open = event.registration_status === 'opened' && !!event.is_attendance_enabled
                if (!open) {
                    setStatus('error')
                    setMessage('Attendance is closed for this event')
                    return
                }
                await selfCheckIn(id)
                setStatus('success')
                toast.success('You are successfully checked in!')
            } catch (error: any) {
                console.error(error)
                setStatus('error')
                setMessage(error.response?.data?.detail || 'Failed to check in. Please ensure you are registered and the event is ongoing.')
            }
        }

        performCheckIn()
    }, [id])

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl border border-zinc-100 overflow-hidden p-8 text-center space-y-6">

                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-6 py-10">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-zinc-200 border-t-yellow-400"></div>
                        <div>
                            <h1 className="text-2xl font-black text-zinc-900">Checking In...</h1>
                            <p className="text-zinc-500 font-medium mt-2">Please wait a moment</p>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-6 py-6 animate-fadeIn">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-zinc-900 leading-tight">You're Checked In!</h1>
                            <p className="text-zinc-500 font-medium mt-3">Your attendance for <b>{eventTitle}</b> has been marked.</p>
                        </div>

                        <div className="w-full pt-6">
                            <Link
                                href={`/events/${id}`}
                                className="block w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                            >
                                Go to Event Page
                            </Link>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-6 py-6 animate-fadeIn">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-zinc-900">Check-in Failed</h1>
                            <p className="text-red-600 font-medium mt-3 bg-red-50 p-4 rounded-xl border border-red-100 text-sm">
                                {message}
                            </p>
                        </div>

                        <div className="w-full pt-6 space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="block w-full py-3 bg-zinc-100 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-200 transition-colors"
                            >
                                Try Again
                            </button>
                            <Link
                                href={`/events/${id}`}
                                className="block w-full py-3 text-zinc-400 font-bold hover:text-zinc-600 transition-colors text-sm"
                            >
                                Back to Event
                            </Link>
                        </div>
                    </div>
                )}

            </div>

            <p className="mt-8 text-xs font-bold text-zinc-300 uppercase tracking-widest">
                ATAS Platform
            </p>
        </div>
    )
}
