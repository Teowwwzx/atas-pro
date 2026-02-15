'use client'

import React, { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { ProfileResponse } from '@/services/api.types'
import * as api from '@/services/api'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { PlacesAutocomplete } from '@/components/ui/PlacesAutocomplete'

interface BookExpertModalProps {
    isOpen: boolean
    onClose: () => void
    expert: ProfileResponse
    onSuccess?: () => void
}

export function BookExpertModal({
    isOpen,
    onClose,
    expert,
    onSuccess,
}: BookExpertModalProps) {
    const router = useRouter()
    const { user } = useUser()

    const [topic, setTopic] = useState('')
    const [startDatetime, setStartDatetime] = useState('')
    const [duration, setDuration] = useState('60') // minutes
    const [eventFormat, setEventFormat] = useState('panel_discussion')
    const [eventType, setEventType] = useState('online')
    const [message, setMessage] = useState('')
    const [venueAddress, setVenueAddress] = useState('')
    const [placeId, setPlaceId] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Restore draft if exists
    useEffect(() => {
        if (isOpen && expert) {
            const saved = localStorage.getItem(`booking_draft_${expert.user_id}`)
            if (saved) {
                try {
                    const data = JSON.parse(saved)
                    setTopic(data.topic || '')
                    setStartDatetime(data.startDatetime || '')
                    setDuration(data.duration || '60')
                    setEventFormat(data.eventFormat || 'panel_discussion')
                    setEventType(data.eventType || 'online')
                    setMessage(data.message || '')
                    setVenueAddress(data.venue_address || '')
                    setPlaceId(data.place_id || '')
                    toast.success('Previous draft restored')
                    // Clear after restoring? Maybe keep until success.
                } catch (e) {
                    console.error('Failed to restore draft', e)
                }
            }
        }
    }, [isOpen, expert])

    const handleGenerate = async () => {
        if (!topic) {
            toast.error('Please enter a topic first')
            return
        }
        setIsGenerating(true)
        try {
            const res = await api.generateProposal({
                expert_name: expert.full_name,
                topic: topic,
                student_name: undefined  // Optional, backend will use current user's email
            })
            // Backend returns {title, description}
            setMessage(res.description)
            toast.success('Proposal generated!')

            // Show login hint for unauthenticated users
            if (!user) {
                setTimeout(() => {
                    toast('💡 Login to auto-fill your info in proposals', {
                        duration: 4000,
                        icon: '👤'
                    })
                }, 800)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to generate proposal')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!startDatetime || !topic || !message) {
            toast.error('Please fill in all fields')
            return
        }

        // Lazy Login Check
        if (!user) {
            const draft = {
                topic,
                startDatetime,
                duration,
                eventFormat,
                eventType,
                message,
                venue_address: venueAddress,
                place_id: placeId
            }

            // Clean up any old booking drafts first
            try {
                const keys = Object.keys(localStorage)
                keys.filter(k => k.startsWith('booking_draft_')).forEach(k => {
                    localStorage.removeItem(k)
                })
            } catch (e) {
                // localStorage not available
            }

            // Save new draft
            localStorage.setItem(`booking_draft_${expert.user_id}`, JSON.stringify(draft))
            toast.success('Draft saved! Redirecting to login...', { duration: 3000 })
            // Small delay to let user see the toast
            setTimeout(() => {
                // NEW: Redirect directly to the dedicated booking page after login
                router.push('/login?redirect=' + encodeURIComponent(`/book/${expert.user_id}`))
            }, 1000)
            return
        }

        setIsSubmitting(true)

        try {
            // 1. Calculate end time
            const start = new Date(startDatetime)
            const end = new Date(start.getTime() + parseInt(duration) * 60000)

            // 2. Create Event
            const event = await api.createEvent({
                title: `Session with ${expert.full_name}: ${topic}`,
                description: message,
                format: eventFormat as any,
                type: eventType as any,
                start_datetime: format(start, "yyyy-MM-dd'T'HH:mm:ssXXX"),
                end_datetime: format(end, "yyyy-MM-dd'T'HH:mm:ssXXX"),
                registration_type: 'free',
                visibility: 'private',
                venue_remark: eventType === 'online' ? 'Online Session' : 'TBD'
            })

            // 3. Invite Expert
            await api.inviteEventParticipant(event.id, {
                user_id: expert.user_id,
                role: 'speaker', // Expert role
                description: message
            })

            localStorage.removeItem(`booking_draft_${expert.id}`)
            toast.success('Invitation sent successfully!')
            onSuccess?.()
            onClose()
        } catch (err: unknown) {
            console.error(err)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const msg = (err as any).response?.data?.detail || 'Failed to book session'
            toast.error(msg)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Reset form on open? Effect? 
    // Simplified for now.

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-zinc-100">
                                <Dialog.Title
                                    as="h3"
                                    className="text-xl font-bold leading-6 text-zinc-900 mb-4"
                                >
                                    Book Session with {expert.full_name}
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                                        <input
                                            type="text"
                                            className="text-gray-700 w-full px-4 py-2 rounded-xl border border-zinc-200 focus:border-yellow-500 focus:ring-yellow-500 transition-colors"
                                            placeholder="e.g. Career Advice, Mock Interview"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                                            <input
                                                type="datetime-local"
                                                className="text-gray-700 w-full px-4 py-2 rounded-xl border border-zinc-200 focus:border-yellow-500 focus:ring-yellow-500 transition-colors"
                                                value={startDatetime}
                                                onChange={(e) => setStartDatetime(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
                                            <select
                                                className="text-gray-700 w-full px-4 py-2 rounded-xl border border-zinc-200 focus:border-yellow-500 focus:ring-yellow-500 transition-colors"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value)}
                                            >
                                                <option value="15">15 mins</option>
                                                <option value="30">30 mins</option>
                                                <option value="45">45 mins</option>
                                                <option value="60">60 mins</option>
                                                <option value="90">90 mins</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Event Format</label>
                                            <select
                                                className="text-gray-700 w-full px-4 py-2 rounded-xl border border-zinc-200 focus:border-yellow-500 focus:ring-yellow-500 transition-colors"
                                                value={eventFormat}
                                                onChange={(e) => setEventFormat(e.target.value)}
                                            >
                                                <option value="panel_discussion">Panel Discussion</option>
                                                <option value="workshop">Workshop</option>
                                                <option value="webinar">Webinar</option>
                                                <option value="seminar">Seminar</option>
                                                <option value="club_event">Club Event</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                                            <select
                                                className="text-gray-700 w-full px-4 py-2 rounded-xl border border-zinc-200 focus:border-yellow-500 focus:ring-yellow-500 transition-colors"
                                                value={eventType}
                                                onChange={(e) => setEventType(e.target.value)}
                                            >
                                                <option value="online">Online</option>
                                                <option value="physical">Physical</option>
                                                <option value="hybrid">Hybrid</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Venue field - only for physical/hybrid events */}
                                    {(eventType === 'physical' || eventType === 'hybrid') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                                            <PlacesAutocomplete
                                                onPlaceSelect={(place) => {
                                                    setVenueAddress(place.label)
                                                    setPlaceId(place.value.place_id)
                                                }}
                                                defaultValue={venueAddress}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-medium text-gray-700">Invitation Message</label>
                                            <button
                                                type="button"
                                                onClick={handleGenerate}
                                                disabled={isGenerating || !topic}
                                                className="text-xs font-bold text-yellow-600 hover:text-yellow-700 disabled:opacity-50 flex items-center gap-1"
                                            >
                                                {isGenerating ? 'Generating...' : '✨ Generate with AI'}
                                            </button>
                                        </div>
                                        <textarea
                                            className="text-gray-700 w-full px-4 py-2 rounded-xl border border-zinc-200 focus:border-yellow-500 focus:ring-yellow-500 transition-colors"
                                            rows={6}
                                            placeholder="Describe what you want to discuss..."
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            required
                                        ></textarea>
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-xl border border-transparent bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-zinc-200 focus:outline-none transition-colors"
                                            onClick={onClose}
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="inline-flex justify-center rounded-xl border border-transparent bg-yellow-500 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-600 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Sending...' : 'Send Invitation'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
