import React, { useEffect, useState } from 'react'
import { EventDetails, ReviewResponse } from '@/services/api.types'
import { getReviewsByEvent, deleteReview } from '@/services/api'
import { toast } from 'react-hot-toast'

interface DashboardTabReviewsProps {
    event: EventDetails
    isOrganizer?: boolean
}

export function DashboardTabReviews({ event, isOrganizer = false }: DashboardTabReviewsProps) {
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [avg, setAvg] = useState(0)

    useEffect(() => {
        const fetchReviews = async () => {
            setLoading(true)
            try {
                const data = await getReviewsByEvent(event.id)
                setReviews(data)
                if (data.length > 0) {
                    const sum = data.reduce((a, b) => a + b.rating, 0)
                    setAvg(sum / data.length)
                }
            } catch (error) {
                toast.error('Failed to load reviews')
            } finally {
                setLoading(false)
            }
        }
        fetchReviews()
    }, [event.id])

    const handleDelete = async (reviewId: string) => {
        if (!confirm('Are you sure you want to delete this review?')) return
        try {
            await deleteReview(reviewId)
            setReviews(prev => prev.filter(r => r.id !== reviewId))
            toast.success('Review deleted')
            
            // Recalculate average
            const remaining = reviews.filter(r => r.id !== reviewId)
            if (remaining.length > 0) {
                const sum = remaining.reduce((a, b) => a + b.rating, 0)
                setAvg(sum / remaining.length)
            } else {
                setAvg(0)
            }
            
        } catch (error) {
            toast.error('Failed to delete review')
        }
    }

    if (loading) {
        return <div className="text-center py-8 text-zinc-500">Loading reviews...</div>
    }

    if (reviews.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-zinc-900">No reviews yet</h3>
                <p className="text-zinc-500">Wait for participants to review your event.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-1">Overall Rating</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-yellow-500">{avg.toFixed(1)}</span>
                        <div className="flex text-yellow-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <svg key={i} className={`w-5 h-5 ${i < Math.round(avg) ? 'fill-current' : 'text-zinc-200'}`} viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>
                        <span className="text-zinc-400 font-medium ml-2">({reviews.length} reviews)</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {reviews.map(review => (
                    <div key={review.id} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm relative group">
                         {isOrganizer && (
                            <button 
                                onClick={() => handleDelete(review.id)}
                                className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 transition-colors p-2"
                                title="Delete Review"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                {review.is_anonymous ? (
                                    <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden border border-zinc-100 flex items-center justify-center">
                                        <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-sm">
                                            A
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden border border-zinc-100">
                                        {review.reviewer_avatar ? (
                                            <img src={review.reviewer_avatar} alt={review.reviewer_name || 'Reviewer'} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-sm">
                                                {(review.reviewer_name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-zinc-900">
                                            {review.reviewer_name || 'Anonymous User'}
                                        </span>
                                        {review.is_anonymous && (
                                            <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full font-medium">Anonymous</span>
                                        )}
                                    </div>
                                    <div className="flex text-yellow-400 text-xs mt-0.5">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <svg key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-current' : 'text-zinc-200'}`} viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 mt-0.5">
                                        {new Date(review.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-zinc-700 text-sm leading-relaxed">{review.comment || (
                            <span className="text-zinc-400 italic">No comment provided</span>
                        )}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
