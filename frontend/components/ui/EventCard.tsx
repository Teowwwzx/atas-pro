import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { EventDetails } from '@/services/api.types'
import { Avatar } from './Avatar'

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    })
}

interface EventCardProps {
    event: EventDetails
    className?: string
    compact?: boolean
    reviewsSummary?: { averageRating?: number; reviewsCount?: number; latestComment?: string }
}

export const EventCard: React.FC<EventCardProps> = ({ event, className = '', compact = false, reviewsSummary }) => {
    const startDate = new Date(event.start_datetime)
    const endDate = new Date(event.end_datetime)
    const durationMs = endDate.getTime() - startDate.getTime()
    const durationHrs = durationMs / (1000 * 60 * 60)
    const durationStr = durationHrs > 0 ? `(${durationHrs % 1 === 0 ? durationHrs : durationHrs.toFixed(1)}h)` : ''

    const heightClass = compact ? 'h-56' : 'h-[280px] md:h-[400px]'
    const avg = reviewsSummary?.averageRating ?? event.average_rating ?? 0
    const count = reviewsSummary?.reviewsCount ?? event.reviews_count ?? 0
    const latest = reviewsSummary?.latestComment || ''
    const hasSponsors = event.sponsors && event.sponsors.length > 0

    const getFormatColor = (format: string) => {
        switch (format?.toLowerCase()) {
            case 'seminar': return 'bg-blue-600 text-white border-blue-700'
            case 'workshop': return 'bg-purple-600 text-white border-purple-700'
            case 'webinar': return 'bg-indigo-600 text-white border-indigo-700'
            case 'panel_discussion': return 'bg-orange-600 text-white border-orange-700'
            case 'competition': return 'bg-red-600 text-white border-red-700'
            default: return 'bg-zinc-900/90 text-white border-zinc-700'
        }
    }

    const renderStars = (rating: number) => {
        const stars = []
        for (let i = 1; i <= 5; i++) {
            const filled = i <= Math.round(rating)
            stars.push(
                <svg key={i} className={`w-3.5 h-3.5 ${filled ? 'text-yellow-400' : 'text-zinc-300'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            )
        }
        return <div className="flex items-center gap-1">{stars}</div>
    }

    return (
        <Link href={`/events/${event.id}`} className={`block h-full ${className}`}>
            <div className={`group relative ${heightClass} w-full rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-zinc-100/10`}>
                {/* Background Image */}
                {event.cover_url ? (
                    <Image
                        src={event.cover_url}
                        alt={event.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={false}
                    />
                ) : (
                    <div className="absolute inset-0 w-full h-full bg-zinc-800 flex items-center justify-center">
                        <span className="text-zinc-700 text-9xl font-black opacity-20 select-none uppercase">{event.title.charAt(0)}</span>
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-95" />

                {/* Badges - Top Right */}
                <div className="absolute top-4 right-4 md:top-6 md:right-6 flex flex-col items-end gap-2 z-10 w-full px-4 md:px-6 pointer-events-none">
                    <div className="flex gap-2 justify-end w-full">
                        {hasSponsors && (
                            <span className="px-3 py-1 rounded-full bg-yellow-500 text-white border border-yellow-600 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Sponsored
                            </span>
                        )}
                        {event.format && (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md ${getFormatColor(event.format)}`}>
                                {event.format.replace('_', ' ')}
                            </span>
                        )}
                        {event.registration_type && (
                            <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider shadow-md ${event.registration_type === 'free'
                                ? 'bg-emerald-600 text-white border-emerald-700'
                                : 'bg-blue-600 text-white border-blue-700'
                                }`}>
                                {event.registration_type}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 flex flex-col justify-end h-full z-10">

                    <div className="space-y-2 md:space-y-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        {/* Title */}
                        <h3 className="text-lg md:text-2xl font-black text-white leading-tight line-clamp-2 group-hover:text-yellow-400 transition-colors" title={event.title}>
                            {event.title}
                        </h3>

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-4 text-zinc-300 text-sm font-medium">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                <span className="w-1 h-1 rounded-full bg-zinc-500"></span>
                                {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                {durationStr && <span className="text-zinc-400 text-xs ml-1">{durationStr}</span>}
                            </div>
                        </div>

                        {/* Organizer - Designed to stand out against image */}
                        <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar
                                    src={event.organizer_avatar}
                                    fallback={event.organizer_name ? event.organizer_name.charAt(0).toUpperCase() : '?'}
                                    size="sm"
                                    className="bg-white/10 border border-white/20 backdrop-blur-sm text-white"
                                />
                                <div className="text-xs">
                                    <span className="block text-zinc-400 font-medium uppercase tracking-wider text-[10px]">Hosted by</span>
                                    <span className="block text-white font-bold truncate max-w-[120px]">{event.organizer_name || 'Event Host'}</span>
                                </div>
                            </div>

                            {/* Arrow Icon */}
                            <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </div>
                        </div>

                        {count > 0 && (
                            <div className="mt-3 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    {renderStars(avg)}
                                    <span className="text-zinc-200 font-bold">{avg.toFixed(1)}</span>
                                    <span className="text-zinc-400">({count})</span>
                                </div>
                                {latest && (
                                    <span className="text-zinc-300 truncate max-w-[50%] italic">“{latest}”</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}
