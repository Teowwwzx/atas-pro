"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProfileResponse } from '@/services/api.types'
import { BookExpertModal } from '@/components/event/BookExpertModal'
import { useUser } from '@/hooks/useUser'

interface ExpertCardProps {
    expert: ProfileResponse
}

export function ExpertCard({ expert }: ExpertCardProps) {
    const router = useRouter()
    const { user } = useUser() // Check authentication
    const [isBookingOpen, setIsBookingOpen] = useState(false)

    const handleBookClick = () => {
        if (!user) {
            // Redirect to login if not authenticated
            router.push('/login?redirect=/experts')
        } else {
            setIsBookingOpen(true)
        }
    }

    return (
        <>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            {expert.avatar_url ? (
                                <img src={expert.avatar_url} alt={expert.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-bold">
                                    {expert.full_name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">{expert.full_name}</h3>
                            <p className="text-sm text-yellow-600 font-medium">{expert.title || 'Expert'}</p>
                            <div className="flex items-center gap-1 mt-1">
                                <span className="text-yellow-400">★</span>
                                <span className="text-sm font-bold text-gray-700">{expert.average_rating?.toFixed(1) || '0.0'}</span>
                                <span className="text-xs text-gray-500">({expert.reviews_count || 0} reviews)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="text-sm text-gray-600 line-clamp-2">{expert.bio || 'No bio available.'}</div>
                </div>

                {expert.availability && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Available: {expert.availability}</span>
                    </div>
                )}

                <div className="mt-6">
                    <button
                        onClick={handleBookClick}
                        className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                    >
                        Book Session
                    </button>
                </div>
            </div>

            <BookExpertModal
                isOpen={isBookingOpen}
                onClose={() => setIsBookingOpen(false)}
                expert={expert}
                onSuccess={() => setIsBookingOpen(false)}
            />
        </>
    )
}
