'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { validateWalkInToken, registerWalkIn } from '@/services/api'
import { EventDetails } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { formatEventDate } from '@/lib/date'
import Link from 'next/link'

export default function WalkInTokenPage() {
    const params = useParams()
    const token = params?.token as string

    const [event, setEvent] = useState<EventDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [formData, setFormData] = useState({ name: '', email: '' })
    const [file, setFile] = useState<File | null>(null)

    useEffect(() => {
        if (token) {
            loadEvent()
        }
    }, [token])

    const loadEvent = async () => {
        try {
            const data = await validateWalkInToken(token)
            setEvent(data)
        } catch (error) {
            console.error(error)
            toast.error('Invalid or expired link')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!event) return

        if (!formData.name || !formData.email) {
            toast.error('Please fill in all fields')
            return
        }

        if (event.registration_type === 'paid' && !file) {
            toast.error('Please upload payment receipt')
            return
        }

        setSubmitting(true)
        try {
            const reqData = {
                name: formData.name,
                email: formData.email,
                payment_proof_url: ''
            }

            await registerWalkIn(token, reqData, file || undefined)
            setSuccess(true)
            toast.success('Registration successful')
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Registration failed')
        } finally {
            setSubmitting(false)
        }
    }

    // ... (rest of component)

    // I will write the component assuming the backend fix.

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            )}

            {/* Error State */}
            {!loading && !event && (
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
                    <p className="text-gray-600 mb-6">
                        This walk-in registration link is invalid or has expired.
                    </p>
                    <Link href="/" className="text-indigo-600 font-medium hover:text-indigo-800">
                        Go Home
                    </Link>
                </div>
            )}

            {/* Success State */}
            {success && event && (
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
                    <p className="text-gray-600 mb-6">
                        You have successfully checked in for <span className="font-semibold text-gray-900">{event.title}</span>.
                    </p>
                    <Link href="/" className="block w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors">
                        Continue to Home
                    </Link>
                </div>
            )}

            {/* Registration Form */}
            {!loading && !success && event && (
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="relative h-48 bg-gray-200">
                        <ImageWithFallback
                            src={event.cover_url || ''}
                            alt={event.title}
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                            <h1 className="text-2xl font-bold leading-tight mb-2">{event.title}</h1>
                            <div className="flex items-center text-sm text-white/90">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatEventDate(event.start_datetime)}
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Walk-in Registration</h2>
                            <p className="text-sm text-gray-500">Enter your details to check in.</p>
                        </div>

                        {event.registration_type === 'paid' && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                                <p className="text-sm text-yellow-800 font-medium flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Paid Event: {event.currency} {event.price?.toFixed(2)}
                                </p>
                                <p className="text-xs text-yellow-600 mt-1 ml-7">
                                    Please upload your payment receipt.
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="text-gray-700 mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="text-gray-700 mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border"
                                    required
                                />
                            </div>

                            {event.registration_type === 'paid' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Payment Receipt</label>
                                    <input
                                        type="file"
                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                        required
                                        accept="image/*,.pdf"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 mt-6"
                            >
                                {submitting ? 'Checking in...' : 'Check In'}
                            </button>

                            <p className="text-xs text-center text-gray-400 font-bold mt-4">
                                By checking in, you agree to our <Link href="/terms" className="underline hover:text-indigo-600">Terms</Link> and <Link href="/privacy" className="underline hover:text-indigo-600">Privacy Policy</Link>.
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
