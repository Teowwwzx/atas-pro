'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { toast } from 'react-hot-toast'
import { createReview } from '@/services/api'

interface EventReviewModalProps {
    isOpen: boolean
    onClose: () => void
    eventId: string
    eventTitle: string
    organizerId: string // Need organizer ID to set as reviewee
    onSuccess?: () => void
}

export function EventReviewModal({ isOpen, onClose, eventId, eventTitle, organizerId, onSuccess }: EventReviewModalProps) {
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setRating(0)
            setHoverRating(0)
            setComment('')
        }
    }, [isOpen])

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error('Please select a rating')
            return
        }
        setSubmitting(true)
        try {
            // Use createReview (ReviewCreate)
            await createReview({
                event_id: eventId,
                reviewee_id: organizerId,
                rating,
                comment
            })
            toast.success('Review submitted successfully!')
            if (onSuccess) onSuccess()
            onClose()
        } catch (error: any) {
            console.error(error)
            toast.error(error.response?.data?.detail || 'Failed to submit review')
        } finally {
            setSubmitting(false)
        }
    }

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
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-black leading-6 text-zinc-900 border-b border-zinc-100 pb-4 mb-4"
                                >
                                    Review Event
                                    <p className="text-sm font-medium text-zinc-500 mt-1">{eventTitle}</p>
                                </Dialog.Title>

                                <div className="mt-2 space-y-6">
                                    {/* Rating Stars */}
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-sm font-bold text-zinc-700">How was the event?</p>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    className="focus:outline-none transition-transform hover:scale-110"
                                                    onMouseEnter={() => setHoverRating(star)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    onClick={() => setRating(star)}
                                                >
                                                    <svg
                                                        className={`w-10 h-10 ${star <= (hoverRating || rating)
                                                            ? 'text-yellow-400 fill-yellow-400'
                                                            : 'text-zinc-300'
                                                            }`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="1.5"
                                                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                                        />
                                                    </svg>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Comment */}
                                    <div>
                                        <label htmlFor="comment" className="block text-sm font-bold text-zinc-700 mb-2">
                                            Comments (Optional)
                                        </label>
                                        <textarea
                                            id="comment"
                                            rows={4}
                                            className="text-gray-700 w-full rounded-xl border-zinc-200 focus:border-blue-500 focus:ring-blue-500 bg-zinc-50"
                                            placeholder="Share your experience..."
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-xl border border-transparent bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2"
                                        onClick={onClose}
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleSubmit}
                                        disabled={submitting || rating === 0}
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
