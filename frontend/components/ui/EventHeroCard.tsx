"use client"

import React, { useState } from 'react'
import { EventDetails } from '@/services/api.types'
import { format } from 'date-fns'
import { ImagePreviewModal } from '@/components/ui/ImagePreviewModal'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'

interface EventHeroCardProps {
    event: EventDetails
    enableImagePreview?: boolean
}

export function EventHeroCard({ event, enableImagePreview }: EventHeroCardProps) {
    const startDate = new Date(event.start_datetime)
    const allowedHosts = new Set(['res.cloudinary.com', 'picsum.photos', 'placehold.co'])
    const pickCover = () => {
        const url = event.cover_url || ''
        try {
            const u = new URL(url)
            if (allowedHosts.has(u.hostname)) return url
        } catch { }
        return `https://placehold.co/1200x600/png?text=${encodeURIComponent(event.title)}`
    }
    const coverUrl = pickCover()
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    const handlePreview = () => {
        if (enableImagePreview && coverUrl) setPreviewImage(coverUrl)
    }

    // Determine if we need to use Next/Image unoptimized if it's an SVG from ui-avatars
    // However, here we are using standard <img> tag. 
    // The error says <Image> so it must be used somewhere else or Next.js converts it? 
    // Actually, line 4 imports Image from 'next/image' but it's not used in this file except imported?
    // Wait, in line 33 it uses <img>.
    // The error is explicit about <Image>. 
    
    // Let's check imports.
    // Line 4: import Image from 'next/image' -> unused?
    // Wait, the file content I read shows:
    // 33: <img ... />
    
    // Ah, maybe the user is using an older version of the file or another component?
    // The grep found DashboardHeroCard.tsx too. Let's check that.

    return (
        <div className="w-full relative h-[420px] rounded-[2.5rem] overflow-hidden">
            <ImageWithFallback
                src={coverUrl}
                fallbackSrc={`https://placehold.co/1200x600/png?text=${encodeURIComponent(event.title)}`}
                alt={event.title}
                className="object-cover"
                fill
                onClick={handlePreview}
                unoptimized={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                <div className="space-y-4 max-w-4xl">
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight truncate">
                        {event.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-6 text-zinc-200 font-medium text-lg pt-2">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {format(startDate, 'EEEE, MMMM d, yyyy • h:mm a')}
                        </div>
                        {event.venue_remark && (
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="truncate max-w-[250px]">{event.venue_remark}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ImagePreviewModal
                isOpen={!!previewImage}
                imageUrl={previewImage}
                onClose={() => setPreviewImage(null)}
            />
        </div>
    )
}
