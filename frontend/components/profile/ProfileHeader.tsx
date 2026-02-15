import React, { useState } from 'react'
import { ProfileResponse } from '@/services/api.types'
import { SponsorBadge } from '../ui/SponsorBadge'
import { SponsorInfoModal } from './SponsorInfoModal'

import { ProfileBadge, IntentType, INTENT_CONFIG } from './ProfileBadge'
import { ImagePreviewModal } from '../ui/ImagePreviewModal'

interface ProfileHeaderProps {
    profile: ProfileResponse
    isOwnProfile: boolean
    onEdit: () => void
    onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    avatarInputRef: React.RefObject<HTMLInputElement | null>
    coverInputRef: React.RefObject<HTMLInputElement | null>
    followersCount: number
    followingCount: number
    onViewFollowers: () => void
    onViewFollowing: () => void
    customActions?: React.ReactNode
}

export function ProfileHeader({
    profile,
    isOwnProfile,
    onEdit,
    onAvatarChange,
    onCoverChange,
    avatarInputRef,
    coverInputRef,
    followersCount,
    followingCount,
    onViewFollowers,
    onViewFollowing,
    customActions
}: ProfileHeaderProps) {
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [showSponsorModal, setShowSponsorModal] = useState(false)

    const getTierStyles = (tier: string | null | undefined) => {
        switch (tier) {
            case 'Gold':
                return {
                    ring: 'ring-yellow-400',
                    shadow: 'shadow-[0_0_30px_rgba(250,204,21,0.6)]',
                    badge: 'bg-gradient-to-r from-yellow-100 via-yellow-200 to-yellow-100 text-yellow-800 border-yellow-300',
                }
            case 'Silver':
                return {
                    ring: 'ring-slate-300',
                    shadow: 'shadow-[0_0_30px_rgba(203,213,225,0.6)]',
                    badge: 'bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 text-slate-800 border-slate-300',
                }
            case 'Bronze':
                return {
                    ring: 'ring-amber-700',
                    shadow: 'shadow-[0_0_30px_rgba(180,83,9,0.4)]',
                    badge: 'bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 text-amber-800 border-amber-300',
                }
            default:
                return {
                    ring: 'ring-amber-50',
                    shadow: 'shadow-2xl',
                    badge: 'hidden',
                }
        }
    }

    const tierStyle = getTierStyles(profile.sponsor_tier)

    const primaryIntent = profile.intents && profile.intents.length > 0 ? profile.intents[0] : null
    const badgeConfig = primaryIntent ? INTENT_CONFIG[primaryIntent as IntentType] : null

    return (
        <div className="relative mb-8">
            {/* Cover Image Container */}
            <div className="relative w-full h-64 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-sm bg-zinc-100 group">
                {profile.cover_url ? (
                    <img
                        src={profile.cover_url}
                        alt="Cover"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer"
                        onClick={() => setPreviewImage(profile.cover_url!)}
                    />
                ) : (
                    <div className="w-full h-full bg-yellow-400 flex items-center justify-center">
                        <div className="text-zinc-900/10 text-9xl font-black select-none">ATAS</div>
                    </div>
                )}

                {/* Hover Overlay for Preview (Cover) */}
                {profile.cover_url && (
                    <div
                        className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 cursor-pointer backdrop-blur-[1px]"
                        onClick={() => setPreviewImage(profile.cover_url!)}
                    >
                        <div className="bg-black/40 p-3 rounded-full text-white backdrop-blur-md transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Cover Edit Button - Always Visible & High Z-Index */}
                {isOwnProfile && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }}
                            className="absolute top-4 right-4 z-40 bg-zinc-900/90 text-yellow-400 p-3 rounded-full shadow-xl hover:scale-110 hover:bg-zinc-800 transition-all border border-white/20"
                            title="Change Cover"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                        <input
                            ref={coverInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={onCoverChange}
                        />
                    </>
                )}
            </div>

            {/* Info Bar - Below Cover with Overlapping Avatar */}
            <div className="flex flex-col md:flex-row px-4 sm:px-10 relative">
                {/* Avatar Section */}
                <div className="-mt-16 sm:-mt-20 shrink-0 relative z-30 mr-0 md:mr-8 mb-4 md:mb-0 flex justify-center md:block">
                    <div className="relative group">
                        <div
                            className={`h-32 w-32 sm:h-44 sm:w-44 rounded-[2rem] ring-8 ${tierStyle.ring} bg-white overflow-hidden ${tierStyle.shadow} cursor-pointer relative z-20 transition-all duration-500`}
                            onClick={() => profile.avatar_url && setPreviewImage(profile.avatar_url)}
                        >
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.full_name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-5xl text-yellow-400 font-bold">
                                    {profile.full_name?.charAt(0) || 'U'}
                                </div>
                            )}

                            {/* Gold Shine Effect */}
                            {profile.sponsor_tier === 'Gold' && (
                                <div className="absolute inset-0 pointer-events-none z-30">
                                    <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-yellow-100/50 to-transparent -skew-x-12 animate-shine"></div>
                                </div>
                            )}

                            {/* Hover Overlay for Preview */}
                            {profile.avatar_url && (
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-40 backdrop-blur-[1px]">
                                    <svg className="w-8 h-8 text-white drop-shadow-md transform scale-75 group-hover:scale-100 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                            )}

                            {/* Straight Intent Badge Banner */}
                            {badgeConfig && (
                                <div
                                    className={`absolute bottom-0 left-0 right-0 py-1.5 z-20 flex items-center justify-center gap-1 ${badgeConfig.bgColor}`}
                                >
                                    <div className={`w-3 h-3 ${badgeConfig.color}`}>
                                        {badgeConfig.icon}
                                    </div>
                                    <span
                                        className={`text-[10px] font-black tracking-widest uppercase truncate ${badgeConfig.color}`}
                                    >
                                        {badgeConfig.label}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Animated Glow for Gold Tier */}
                        {profile.sponsor_tier === 'Gold' && (
                            <div className="absolute inset-0 rounded-[2rem] bg-yellow-400 blur-xl opacity-40 animate-pulse z-10"></div>
                        )}

                        {/* Avatar Edit Button - Always Visible & High Z-Index */}
                        {isOwnProfile && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
                                    className="absolute top-1 right-1 z-40 bg-zinc-900 text-yellow-400 p-2.5 rounded-full shadow-xl hover:scale-110 hover:bg-zinc-800 transition-all border-2 border-white"
                                    title="Change Avatar"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={onAvatarChange}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Info Text & Actions */}
                <div className="pt-2 md:pt-4 flex-1 flex flex-col md:flex-row justify-between items-center md:items-start text-center md:text-left">
                    <div>
                        {/* Name */}
                        {/* Name */}
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2 flex-wrap">
                            <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight leading-none">
                                {profile.full_name}
                            </h1>
                            {profile.sponsor_tier && (
                                <button
                                    onClick={() => setShowSponsorModal(true)}
                                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-bold shadow-sm border ${tierStyle.badge} animate-fadeIn hover:scale-105 active:scale-95 transition-transform cursor-pointer`}
                                    title="Click to see what this badge means"
                                >
                                    <SponsorBadge tier={profile.sponsor_tier} size="sm" />
                                    <span>{profile.sponsor_tier} Sponsor</span>
                                </button>
                            )}
                        </div>

                        {/* Title & Location - Removed Location as requested */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-zinc-600 font-medium text-sm sm:text-base mb-4">
                            {profile.title && <span className="text-zinc-900 font-bold">{profile.title}</span>}
                        </div>

                        {/* Followers/Following - Moved Below Country */}
                        <div className="flex items-center justify-center md:justify-start gap-6 text-sm">
                            <button onClick={onViewFollowers} className="group flex items-center gap-1.5 hover:text-zinc-900 transition-colors">
                                <span className="font-black text-zinc-900 text-lg">{followersCount}</span>
                                <span className="text-zinc-500 font-bold group-hover:underline decoration-yellow-400 decoration-2 underline-offset-4">Followers</span>
                            </button>
                            <button onClick={onViewFollowing} className="group flex items-center gap-1.5 hover:text-zinc-900 transition-colors">
                                <span className="font-black text-zinc-900 text-lg">{followingCount}</span>
                                <span className="text-zinc-500 font-bold group-hover:underline decoration-yellow-400 decoration-2 underline-offset-4">Following</span>
                            </button>
                        </div>
                    </div>

                    {/* Actions: Edit Profile (Own) or Custom Actions (Public) */}
                    <div className="mt-6 md:mt-0 flex flex-col items-center md:items-end gap-3">
                        {isOwnProfile ? (
                            <button
                                onClick={onEdit}
                                className="px-8 py-3 bg-zinc-900 text-yellow-400 rounded-xl shadow-lg font-bold hover:bg-zinc-800 hover:scale-105 transition-all duration-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit Profile
                            </button>
                        ) : (
                            customActions
                        )}
                    </div>
                </div>
            </div>
            <ImagePreviewModal
                isOpen={!!previewImage}
                imageUrl={previewImage}
                onClose={() => setPreviewImage(null)}
            />
            <SponsorInfoModal 
                isOpen={showSponsorModal} 
                onClose={() => setShowSponsorModal(false)} 
            />
        </div>
    )
}
