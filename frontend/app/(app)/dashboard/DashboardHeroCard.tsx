'use client'

import React, { useRef, useState } from 'react'
import Image from 'next/image'
import { EventDetails, MyEventItem } from '@/services/api.types'
import { format } from 'date-fns'
import { updateEventCover } from '@/services/api'
import { toast } from 'react-hot-toast'
import { EventPhase, canEditCoreDetails } from '@/lib/eventPhases'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'

interface DashboardHeroCardProps {
    event: EventDetails | MyEventItem
    onPreview?: () => void
    canEditCover?: boolean
    phase?: EventPhase // Make optional for public views
    onCoverUpdated?: () => void
}

export function DashboardHeroCard({ event, onPreview, canEditCover, phase = EventPhase.PRE_EVENT, onCoverUpdated }: DashboardHeroCardProps) {
    // Handle different ID fields between EventDetails (id) and MyEventItem (event_id)
    const eventId = 'id' in event ? event.id : event.event_id

    const startDate = new Date(event.start_datetime)
    const allowedHosts = new Set(['picsum.photos', 'placehold.co']) // Updated allowedHosts

    const pickCover = () => {
        const url = event.cover_url || ''
        if (!url) return `https://placehold.co/800x400/png?text=${encodeURIComponent(event.title)}`

        try {
            const u = new URL(url)
            // Allow all Cloudinary subdomains (e.g., res.cloudinary.com, res-1.cloudinary.com, etc.)
            if (u.hostname.includes('cloudinary.com')) return url
            // Allow other trusted hosts
            if (allowedHosts.has(u.hostname)) return url
            // If URL is valid but not whitelisted, still allow it (trust the backend)
            return url
        } catch {
            // Invalid URL, use placeholder
            return `https://placehold.co/800x400/png?text=${encodeURIComponent(event.title)}`
        }
    }

    const coverUrl = pickCover()
    const fileRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''
        setUploading(true)
        const tid = toast.loading('Updating cover...')
        try {
            await updateEventCover(eventId, file)
            toast.success('Cover updated', { id: tid })
            onCoverUpdated && onCoverUpdated()
        } catch {
            toast.error('Failed to update cover', { id: tid })
        } finally {
            setUploading(false)
        }
    }

    return (
        <div
            className="w-full relative h-[450px] rounded-t-[3rem] overflow-hidden group isolate bg-zinc-900 border-b border-zinc-800"
        >
            {/* Background Image - with zoom and slight brightness reduction */}
            <div className="absolute inset-0 overflow-hidden">
                <ImageWithFallback
                    src={coverUrl}
                    fallbackSrc={`https://placehold.co/800x400/png?text=${encodeURIComponent(event.title)}`}
                    alt={event.title}
                    fill
                    className="object-cover opacity-90"
                    unoptimized={false}
                />
            </div>

            {/* Cinematic Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent opacity-80" />

            {/* Top Actions Bar */}
            <div className="absolute top-0 left-0 right-0 p-8 md:p-10 flex items-start justify-between z-20">
                {/* Payment Status Warning (Top Left) */}
                <div className="flex flex-col items-start gap-2">
                    {/* @ts-ignore */}
                    {(event.my_role === 'audience' && event.registration_type === 'paid' && (event.my_status === 'pending' || event.my_payment_status === 'pending') && !event.payment_proof_url) ? (
                        <div className="bg-red-500/90 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-red-400 shadow-xl animate-pulse">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 font-bold text-sm">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Payment Required
                                </div>
                                <p className="text-xs opacity-90 max-w-[200px]">Upload proof of payment to confirm your spot.</p>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Trigger custom event or rely on parent passing a handler/ref?
                                        // Or just create a new input ref here for payment
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = async (ev: any) => {
                                            const file = ev.target.files?.[0];
                                            if (!file) return;
                                            const tid = toast.loading('Uploading receipt...');
                                            try {
                                                const { uploadPaymentProof } = await import('@/services/api');
                                                await uploadPaymentProof(eventId, file);
                                                toast.success('Receipt uploaded! Waiting for verification.', { id: tid });
                                                if (onCoverUpdated) onCoverUpdated(); // Refresh
                                            } catch (err) {
                                                console.error(err)
                                                toast.error('Upload failed', { id: tid });
                                            }
                                        };
                                        input.click();
                                    }}
                                    className="mt-2 bg-white text-red-600 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm hover:bg-zinc-100 transition-colors w-full"
                                >
                                    Upload Receipt
                                </button>
                            </div>
                        </div>
                    ) : null}
                    {/* @ts-ignore */}
                    {event.payment_proof_url && (event.my_status === 'pending' || event.payment_status === 'pending') && (
                        <div className="bg-yellow-500/90 backdrop-blur-md text-white px-3 py-2 rounded-xl border border-yellow-400 shadow-lg text-xs font-bold flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Payment under review
                        </div>
                    )}
                </div>

                {/* Right side actions */}
                <div className="flex gap-3">
                    {canEditCover && canEditCoreDetails(phase) && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
                                className="px-4 py-2 bg-white/10 text-white font-bold text-xs rounded-2xl hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 group/btn"
                            >
                                <svg className="w-4 h-4 group-hover/btn:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {uploading ? 'Uploading...' : 'Change Cover'}
                            </button>
                            <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleFile} />
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Content Area - Removed as per request */}
            {/* <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-20">
                <div className="max-w-5xl space-y-4">
                     Title with improved typography 
                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1] drop-shadow-lg line-clamp-2 md:line-clamp-2">
                        {event.title}
                    </h2>

                     Meta Info Bar 
                    <div className="flex flex-wrap items-center gap-6 md:gap-8 pt-4">
                         Date 
                        <div className="flex items-center gap-3 group/meta">
                            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-yellow-400 group-hover/meta:bg-yellow-400 group-hover/meta:text-black transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="text-zinc-100">
                                {(() => {
                                    const start = new Date(event.start_datetime)
                                    const end = new Date(event.end_datetime)
                                    const isSame = start.toDateString() === end.toDateString()
                                    return (
                                        <div className="font-bold text-base md:text-lg tracking-tight">
                                            {isSame
                                                ? format(start, 'MMMM d, yyyy')
                                                : `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
                                            }
                                            <span className="block text-xs md:text-sm font-medium text-zinc-400 mt-0.5">
                                                {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
                                            </span>
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>

                         Divider 
                        <div className="hidden md:block w-px h-8 bg-white/10"></div>

                         Venue 
                        {event.venue_remark && (
                            <div className="flex items-center gap-3 group/meta">
                                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-yellow-400 group-hover/meta:bg-yellow-400 group-hover/meta:text-black transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-bold text-base md:text-lg text-zinc-100 tracking-tight truncate max-w-[200px] md:max-w-[400px]">
                                        {event.venue_remark}
                                    </div>
                                    <div className="text-xs md:text-sm font-medium text-zinc-400 mt-0.5">
                                        Location
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div> */}
        </div>
    )
}
