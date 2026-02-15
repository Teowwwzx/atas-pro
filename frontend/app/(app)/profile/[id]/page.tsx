'use client'

import React, { useState, useEffect, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProfileByUserId, getReviewsByUser, getPublicEvents, getMyEvents, inviteEventParticipant, getOrganizationById, getMyFollows, getUserFollows, getUserFollowers, followUser, unfollowUser } from '@/services/api'
import { ProfileResponse, ReviewResponse, EventDetails, MyEventItem, OrganizationResponse, FollowerSummary, FollowDetails } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { Dialog, Transition, Menu } from '@headlessui/react'
import { Button } from '@/components/ui/Button'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileView } from '@/components/profile/ProfileView'
import { BookExpertModal } from '@/components/modals/BookExpertModal'
import { createConversation } from '@/services/api'

export default function PublicProfilePage() {
    const params = useParams()
    const router = useRouter()
    const userId = params.id as string

    const avatarInputRef = React.useRef<HTMLInputElement>(null)
    const coverInputRef = React.useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (userId === 'me') {
            router.replace('/profile')
        }
    }, [userId, router])

    const [profile, setProfile] = useState<ProfileResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [orgsById, setOrgsById] = useState<Record<string, OrganizationResponse>>({})

    // Event State
    const [organizedEvents, setOrganizedEvents] = useState<EventDetails[]>([])

    // Invite State
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [myEvents, setMyEvents] = useState<MyEventItem[]>([])
    const [selectedEventId, setSelectedEventId] = useState<string>('')
    const [inviting, setInviting] = useState(false)
    const [isFollowing, setIsFollowing] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)
    const [viewFriends, setViewFriends] = useState<'none' | 'followers' | 'following'>('none')
    const [followersList, setFollowersList] = useState<FollowDetails[]>([])
    const [followingList, setFollowingList] = useState<FollowDetails[]>([])

    const handleViewFollowers = async () => {
        try {
            const data = await getUserFollowers(userId)
            setFollowersList(data)
            setViewFriends('followers')
        } catch (error) {
            toast.error('Failed to load followers')
        }
    }

    const handleViewFollowing = async () => {
        try {
            const data = await getUserFollows(userId)
            setFollowingList(data)
            setViewFriends('following')
        } catch (error) {
            toast.error('Failed to load following')
        }
    }

    useEffect(() => {
        if (userId) {
            getMyFollows().then(follows => {
                const isF = follows.some(f => f.followee_id === userId)
                setIsFollowing(isF)
            }).catch(() => { })

            const fetchProfile = async () => {
                try {
                    const [profileData, eventsData] = await Promise.all([
                        getProfileByUserId(userId),
                        getPublicEvents()
                    ])
                    setProfile(profileData)

                    // Filter Organized Events
                    const userEvents = eventsData.filter(e => e.organizer_id === userId)
                    setOrganizedEvents(userEvents)

                    try {
                        const revs = await getReviewsByUser(userId)
                        setReviews(revs)
                    } catch { }

                    try {
                        const expOrgIds = Array.from(new Set([
                            ...(profileData.job_experiences?.map(j => j.org_id).filter(Boolean) as string[]),
                            ...(profileData.educations?.map(e => e.org_id).filter(Boolean) as string[])
                        ]))
                        if (expOrgIds.length > 0) {
                            const results = await Promise.all(expOrgIds.map(async (oid) => {
                                const org = await getOrganizationById(oid)
                                return [oid, org] as const
                            }))
                            setOrgsById(Object.fromEntries(results))
                        }
                    } catch { }
                } catch (error: unknown) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setError((error as any).response?.data?.detail || 'Failed to load profile.')
                } finally {
                    setIsLoading(false)
                }
            }
            fetchProfile()
        }
    }, [userId])

    // Fetch my events when opening modal
    useEffect(() => {
        if (showInviteModal) {
            getMyEvents()
                .then(events => {
                    // Only show events where I am organizer
                    setMyEvents(events.filter(e => e.my_role === 'organizer'))
                })
                .catch(() => toast.error('Failed to load your events'))
        }
    }, [showInviteModal])

    const handleConnect = async () => {
        setFollowLoading(true)
        try {
            if (isFollowing) {
                await unfollowUser(userId)
                setIsFollowing(false)
                toast.success('Unfollowed')
            } else {
                await followUser(userId)
                setIsFollowing(true)
                toast.success('Followed!')
            }
        } catch (error) {
            toast.error('Failed to update status')
        } finally {
            setFollowLoading(false)
        }
    }

    const handleInvite = async () => {
        if (!selectedEventId) return
        setInviting(true)
        try {
            await inviteEventParticipant(selectedEventId, {
                user_id: userId,
                role: 'speaker', // Defaulting to speaker as per user request
                description: 'Invited via Profile'
            })
            toast.success('Invitation sent successfully!')
            setShowInviteModal(false)
        } catch (error: unknown) {
            console.error(error)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toast.error((error as any).response?.data?.detail || 'Failed to send invitation')
        } finally {
            setInviting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-amber-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-amber-50">
                <div className="text-center">
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-zinc-100 max-w-md mx-auto">
                        <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 mb-2">Profile Not Found</h3>
                        <p className="text-zinc-500">{error || "This profile doesn't exist or is private."}</p>
                    </div>
                </div>
            </div>
        )
    }

    // Determine if user is a student (not a speaker/expert)
    const isStudent = !profile.can_be_speaker

    const customActions = (
        <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
            {isStudent ? (
                <>
                    <button
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 ${isFollowing
                            ? 'bg-white text-zinc-900 border-2 border-zinc-200 hover:bg-zinc-50'
                            : 'bg-yellow-400 text-zinc-900 hover:bg-yellow-500'
                            }`}
                        onClick={handleConnect}
                        disabled={followLoading}
                    >
                        {isFollowing ? (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Followed
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Follow
                            </>
                        )}
                    </button>

                    {isFollowing && (
                        <button
                            onClick={async () => {
                                try {
                                    const conv = await createConversation([userId])
                                    toast.success('Chat created')
                                    router.push(`/messages?conversation_id=${conv.id}`)
                                } catch (error) {
                                    toast.error('Failed to start chat')
                                }
                            }}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 text-yellow-400 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-md active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Message
                        </button>
                    )}
                </>
            ) : (
                <div className="flex flex-wrap gap-3">
                    {/* Primary: Book Session */}
                    <Link
                        href={`/book/${userId}`}
                        className="flex-1 min-w-[180px] inline-flex justify-center items-center gap-2 px-6 py-3 bg-yellow-400 text-zinc-900 rounded-xl font-bold hover:bg-yellow-500 transition-all shadow-md active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Book Session
                    </Link>

                    {/* Secondary: Message */}
                    <button
                        onClick={async () => {
                            try {
                                const conv = await createConversation([userId])
                                toast.success('Chat created')
                                router.push(`/messages?conversation_id=${conv.id}`)
                            } catch (error) {
                                toast.error('Failed to start chat')
                            }
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-md active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Message
                    </button>

                    {/* Menu for Follow & Invite */}
                    <Menu as="div" className="relative">
                        <Menu.Button className="h-full px-4 bg-white border-2 border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all flex items-center justify-center">
                            <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </Menu.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-xl shadow-xl border border-zinc-100 p-1 z-50 focus:outline-none">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={handleConnect}
                                            className={`${active ? 'bg-zinc-50' : ''} group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-700`}
                                        >
                                            {isFollowing ? (
                                                <>
                                                    <svg className="w-4 h-4 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                    Unfollow
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                                    Follow
                                                </>
                                            )}
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => setShowInviteModal(true)}
                                            className={`${active ? 'bg-zinc-50' : ''} group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-700`}
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                            Invite to Event
                                        </button>
                                    )}
                                </Menu.Item>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>
            )}
        </div>
    )

    return (
        <div className="min-h-screen bg-amber-50 pb-20">
            <div className="mx-auto pt-6 px-4 sm:px-6 lg:px-8">

                <ProfileHeader
                    profile={profile}
                    onEdit={() => { }}
                    isOwnProfile={false}
                    customActions={customActions}
                    avatarInputRef={avatarInputRef}
                    coverInputRef={coverInputRef}
                    onAvatarChange={() => { }}
                    onCoverChange={() => { }}
                    followersCount={profile.followers_count || 0}
                    followingCount={profile.following_count || 0}
                    onViewFollowers={handleViewFollowers}
                    onViewFollowing={handleViewFollowing}
                />

                <ProfileView
                    profile={profile}
                    userInfo={null}
                    events={[]}
                    organizedEvents={organizedEvents}
                    historyEvents={[]}
                    followers={followersList}
                    following={followingList}
                    reviews={!isStudent ? reviews : undefined}
                    isOwnProfile={false}
                    onEdit={() => { }}
                    orgsById={orgsById}
                    viewFriends={viewFriends}
                    setViewFriends={setViewFriends}
                />
            </div>

            {/* Followers/Following Modal */}
            {viewFriends !== 'none' && (
                <div
                    className="fixed inset-0 z-[60] bg-black/50 ml-0 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm"
                    onClick={() => setViewFriends('none')}
                >
                    <div
                        className="bg-white rounded-[2rem] w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-black text-xl text-zinc-900 capitalize">{viewFriends}</h3>
                            <button
                                onClick={() => setViewFriends('none')}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-zinc-500 hover:bg-gray-200 hover:text-zinc-900 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 scrollbar-hide">
                            {(viewFriends === 'followers' ? followersList : followingList).length === 0 ? (
                                <div className="p-8 text-center text-zinc-400 italic">
                                    No {viewFriends} found.
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {(viewFriends === 'followers' ? followersList : followingList).map((item: any) => {
                                        const person = viewFriends === 'followers' ? item.follower : item.followee
                                        if (!person) return null
                                        return (
                                            <Link href={`/profile/${person.id}`} key={item.id} className="flex items-center gap-4 p-3 hover:bg-zinc-50 rounded-2xl transition-colors group">
                                                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-100">
                                                    {person.avatar_url ? (
                                                        <img src={person.avatar_url} className="w-full h-full object-cover" alt={person.full_name} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-yellow-100 text-yellow-600 font-bold text-lg">
                                                            {person.full_name?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-zinc-900 truncate group-hover:text-yellow-600 transition-colors">{person.full_name}</div>
                                                    <div className="text-xs text-zinc-400 font-medium truncate">User</div>
                                                </div>
                                                <svg className="w-5 h-5 text-zinc-300 group-hover:text-yellow-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                </svg>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Organized Events Section - Moved to ProfileView for width consistency */}


            {/* Followers/Following Modal */}
            {viewFriends !== 'none' && (
                <div
                    className="fixed inset-0 z-[60] bg-black/50 ml-0 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm"
                    onClick={() => setViewFriends('none')}
                >
                    <div
                        className="bg-white rounded-[2rem] w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-black text-xl text-zinc-900 capitalize">{viewFriends}</h3>
                            <button
                                onClick={() => setViewFriends('none')}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-zinc-500 hover:bg-gray-200 hover:text-zinc-900 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 scrollbar-hide">
                            {(viewFriends === 'followers' ? followersList : followingList).length === 0 ? (
                                <div className="p-8 text-center text-zinc-400 italic">
                                    No {viewFriends} yet.
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {(viewFriends === 'followers' ? followersList : followingList).map((item: FollowDetails) => {
                                        const person = viewFriends === 'followers' ? item.follower : item.followee
                                        if (!person) return null
                                        return (
                                            <Link href={`/profile/${person.id}`} key={item.id} className="flex items-center gap-4 p-3 hover:bg-zinc-50 rounded-2xl transition-colors group">
                                                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-100">
                                                    {person.avatar_url ? (
                                                        <img src={person.avatar_url} className="w-full h-full object-cover" alt={person.full_name || 'User'} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-yellow-100 text-yellow-600 font-bold text-lg">
                                                            {person.full_name?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-zinc-900 truncate">{person.full_name}</div>
                                                    <div className="text-xs text-zinc-400 font-medium truncate">User</div>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <BookExpertModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                expertId={profile?.user_id || ''}
                expertName={profile?.full_name || ''}
            />
        </div>
    )
}
