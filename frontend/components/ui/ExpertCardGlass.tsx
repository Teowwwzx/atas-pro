"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProfileResponse } from '@/services/api.types'
import { BookExpertModal } from '@/components/event/BookExpertModal'
import { useUser } from '@/hooks/useUser'
import { ProfileBadge, IntentType } from '@/components/profile/ProfileBadge'

const COLORS = [
    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'bg-green-500/10 text-green-400 border-green-500/20',
    'bg-pink-500/10 text-pink-400 border-pink-500/20',
    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'bg-teal-500/10 text-teal-400 border-teal-500/20',
]

function getTagColor(name: string) {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % COLORS.length
    return COLORS[index]
}

interface ExpertCardGlassProps {
    expert: ProfileResponse
    variant?: 'grid' | 'spotlight'
    style?: React.CSSProperties
    className?: string
}

export function ExpertCardGlass({ expert, variant = 'grid', style, className }: ExpertCardGlassProps) {
    const router = useRouter()
    const { user } = useUser()
    const [isBookingOpen, setIsBookingOpen] = useState(false)

    const handleBookClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        // Redirect authenticated users to dedicated book page for richer experience
        if (user) {
            router.push(`/book/${expert.user_id}`)
        } else {
            // Unauthenticated users open modal (will redirect to login then book page)
            setIsBookingOpen(true)
        }
    }

    // Get primary intent for badge
    const primaryIntent = expert.intents?.[0] as IntentType | undefined

    // Spotlight Variant (Horizontal)
    if (variant === 'spotlight') {
        return (
            <>
                <div
                    className={`spotlight-card ${className || ''}`}
                    style={style}
                    onClick={handleBookClick}
                >
                    {expert.cover_url || expert.avatar_url ? (
                        <img
                            src={expert.cover_url || expert.avatar_url}
                            className="spotlight-img"
                            alt={expert.full_name}
                        />
                    ) : (
                        <div className="spotlight-img bg-gray-800" />
                    )}

                    <div className="spotlight-overlay">
                        {expert.title && <div className="expert-role">{expert.title}</div>}
                        <div className="expert-name-lg">{expert.full_name}</div>
                        {expert.origin_country && (
                            <div className="expert-company">
                                <i className="fas fa-building"></i> {expert.origin_country}
                            </div>
                        )}
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

    // Grid Variant (Vertical)
    return (
        <>
            <div
                className={`expert-card-glass ${className || ''}`}
                style={style}
            >
                <div className="avatar-wrapper" style={{ position: 'relative' }}>
                    {expert.avatar_url ? (
                        <img
                            src={expert.avatar_url}
                            className="expert-avatar"
                            alt={expert.full_name}
                        />
                    ) : (
                        <div className="expert-avatar bg-gray-700 flex items-center justify-center text-2xl text-white font-bold">
                            {expert.full_name.charAt(0)}
                        </div>
                    )}

                    {/* Intent Badge Overlay - HIDDEN */}
                    {/* {primaryIntent && (
                        <div style={{ position: 'absolute', bottom: '-8px', right: '-8px' }}>
                            <ProfileBadge intent={primaryIntent} size="sm" />
                        </div>
                    )} */}

                    {/* Verified checkmark - Keep it? User didn't ask to remove. */}
                    <div className="verified-badge">
                        <i className="fas fa-check"></i>
                    </div>
                </div>

                <div className="e-name">{expert.full_name}</div>
                {expert.title && <div className="e-role">{expert.title}</div>}

                <div className="e-tags flex flex-wrap gap-1 mt-2">
                    {/* Show skills first, limit to 3 total */}
                    {expert.skills && expert.skills.slice(0, 3).map(skill => (
                        <span key={skill.id} className={`e-tag px-2 py-0.5 rounded text-[10px] border ${getTagColor(skill.name)}`}>
                            {skill.name}
                        </span>
                    ))}
                    {/* If no skills, show tags (max 3) */}
                    {(!expert.skills || expert.skills.length === 0) && expert.tags && expert.tags.slice(0, 3).map(tag => (
                        <span key={tag.id} className={`e-tag px-2 py-0.5 rounded text-[10px] border ${getTagColor(tag.name)}`}>
                            {tag.name}
                        </span>
                    ))}
                </div>

                <button
                    onClick={handleBookClick}
                    className="btn-view"
                >
                    Book Session
                </button>
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
