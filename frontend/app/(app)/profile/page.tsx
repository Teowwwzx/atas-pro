'use client'

import React, { useEffect, useState, useRef } from 'react'
import {
    getMyProfile, updateProfile, updateAvatar, updateCoverPicture, getMe, getMyEvents, getMyEventHistory,
    getTags, attachMyTag, detachMyTag, addMyEducation, deleteMyEducation, getMyFollows, getMyFollowers, unfollowUser,
    addMyJobExperience, deleteMyJobExperience, createTag,
    getPublicOrganizations, createOrganization, getOrganizationById
} from '@/services/api'
import Link from 'next/link'
import {
    ProfileResponse, ProfileUpdate, UserMeResponse, MyEventItem,
    EducationCreate, EducationResponse, JobExperienceCreate, OrganizationResponse
} from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileView } from '@/components/profile/ProfileView'
import { ProfileEdit } from '@/components/profile/ProfileEdit'

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileResponse | null>(null)
    const [userInfo, setUserInfo] = useState<UserMeResponse | null>(null)
    const [events, setEvents] = useState<MyEventItem[]>([])
    const [historyEvents, setHistoryEvents] = useState<any[]>([])
    const [availableTags, setAvailableTags] = useState<{ id: string, name: string }[]>([])
    const [followers, setFollowers] = useState<any[]>([])
    const [following, setFollowing] = useState<any[]>([])

    // States for Edit Mode
    const [newEducation, setNewEducation] = useState<EducationCreate & { school?: string }>({
        qualification: '',
        field_of_study: '',
        school: '',
        start_datetime: '',
        end_datetime: ''
    })
    const [newJob, setNewJob] = useState<JobExperienceCreate>({ title: '', description: '' })
    const [viewFriends, setViewFriends] = useState<'none' | 'followers' | 'following'>('none')
    const [confirmUnfollowId, setConfirmUnfollowId] = useState<string | null>(null)

    // ... (rest of the component)


    const avatarInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    // Org Search
    const [orgSearch, setOrgSearch] = useState('')
    const [orgOptions, setOrgOptions] = useState<OrganizationResponse[]>([])
    const [orgLoading, setOrgLoading] = useState(false)
    const [selectedOrg, setSelectedOrg] = useState<OrganizationResponse | null>(null)
    const [showCreateOrg, setShowCreateOrg] = useState(false)
    const [newOrgName, setNewOrgName] = useState('')
    const [newOrgType, setNewOrgType] = useState<'company' | 'university' | 'community' | 'nonprofit' | 'government'>('community')
    const [creatingOrg, setCreatingOrg] = useState(false)
    const [orgsById, setOrgsById] = useState<Record<string, OrganizationResponse>>({})

    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [addingEdu, setAddingEdu] = useState(false)
    const [addingJob, setAddingJob] = useState(false)
    const [formData, setFormData] = useState<ProfileUpdate>({})

    useEffect(() => {
        loadProfile()
    }, [])

    useEffect(() => {
        let active = true
        const q = orgSearch.trim()
        if (!q) {
            setOrgOptions([])
            return
        }
        setOrgLoading(true)
        const t = setTimeout(() => {
            getPublicOrganizations({ q, page: 1, page_size: 5 })
                .then(res => { if (active) setOrgOptions(res) })
                .catch(() => { if (active) setOrgOptions([]) })
                .finally(() => { if (active) setOrgLoading(false) })
        }, 300)
        return () => { active = false; clearTimeout(t) }
    }, [orgSearch])

    const loadProfile = async () => {
        try {
            const [profileData, userData, eventsData, historyData, tagsData, followersData, followingData] = await Promise.all([
                getMyProfile(),
                getMe(),
                getMyEvents(),
                getMyEventHistory(),
                getTags(),
                getMyFollowers(),
                getMyFollows()
            ])

            setProfile(profileData)
            setUserInfo(userData)
            setEvents(eventsData)
            setHistoryEvents(historyData)
            setAvailableTags(tagsData)
            setFollowers(followersData)
            setFollowing(followingData)

            setFormData({
                full_name: profileData.full_name,
                bio: profileData.bio,
                linkedin_url: profileData.linkedin_url,
                github_url: profileData.github_url,
                instagram_url: profileData.instagram_url,
                twitter_url: profileData.twitter_url,
                website_url: profileData.website_url,
                visibility: profileData.visibility,
                title: profileData.title,
                availability: profileData.availability,
                country: profileData.country,
                city: profileData.city,
                origin_country: profileData.origin_country,
                can_be_speaker: profileData.can_be_speaker,
                intents: profileData.intents,
                today_status: profileData.today_status,
            })

            // Load organizations
            try {
                const expOrgIds = Array.from(new Set([
                    ...(profileData.job_experiences?.map(j => j.org_id).filter(Boolean) as string[]),
                    ...(profileData.educations?.map(e => e.org_id).filter(Boolean) as string[])
                ]))
                if (expOrgIds.length > 0) {
                    const results = await Promise.all(expOrgIds.map(async (oid) => {
                        try {
                            const org = await getOrganizationById(oid)
                            return [oid, org] as const
                        } catch { return null }
                    }))
                    const validResults = results.filter(r => r !== null) as [string, OrganizationResponse][]
                    setOrgsById(Object.fromEntries(validResults))
                }
            } catch { }

        } catch (error) {
            console.error('Failed to load profile', error)
            toast.error('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const updated = await updateProfile(formData)
            setProfile(updated)
            setEditing(false)
            toast.success('Profile updated!')
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (error) {
            console.error('Failed to update profile', error)
            toast.error('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const loadingToast = toast.loading('Updating avatar...')
        try {
            const updated = await updateAvatar(file)
            setProfile(updated)
            toast.success('Avatar updated!', { id: loadingToast })
        } catch (error) {
            toast.error('Failed to update avatar', { id: loadingToast })
        }
    }

    const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const loadingToast = toast.loading('Updating cover...')
        try {
            const updated = await updateCoverPicture(file)
            setProfile(updated)
            toast.success('Cover updated!', { id: loadingToast })
        } catch (error) {
            toast.error('Failed to update cover', { id: loadingToast })
        }
    }

    // ... Handlers (Duplicated logic from previous monolithic file, but kept here for passing to Edit Component)
    const handleTagToggle = async (tagId: string) => {
        const hasTag = profile?.tags?.some(t => t.id === tagId)
        try {
            if (hasTag) {
                await detachMyTag(tagId)
                setProfile(prev => prev ? { ...prev, tags: prev.tags?.filter(t => t.id !== tagId) } : null)
                toast.success('Tag removed')
            } else {
                await attachMyTag(tagId)
                const tag = availableTags.find(t => t.id === tagId)
                if (tag) {
                    setProfile(prev => prev ? { ...prev, tags: [...(prev.tags || []), tag] } : null)
                    toast.success('Tag added')
                }
            }
        } catch (error) {
            toast.error('Failed to update tags')
        }
    }

    const handleCreateTag = async (name: string) => {
        try {
            const tag = await createTag({ name })
            setAvailableTags(prev => [...prev, tag])
            // Also toggle it ON immediately
            await handleTagToggle(tag.id)
            toast.success('Tag created and added')
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Failed to create tag')
        }
    }

    const handleAddEducation = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newEducation.qualification || !newEducation.field_of_study) return

        setAddingEdu(true)
        try {
            const payload: EducationCreate = {
                qualification: newEducation.qualification,
                field_of_study: newEducation.field_of_study,
                school: newEducation.school,
                start_datetime: newEducation.start_datetime ? new Date(newEducation.start_datetime).toISOString() : undefined,
                end_datetime: newEducation.end_datetime ? new Date(newEducation.end_datetime).toISOString() : undefined
            }

            const edu = await addMyEducation(payload)
            setProfile(prev => prev ? { ...prev, educations: [...(prev.educations || []), edu] } : null)
            setNewEducation({ qualification: '', field_of_study: '', school: '', start_datetime: '', end_datetime: '' })
            toast.success('Education added')
        } catch { toast.error('Failed to add education') } finally { setAddingEdu(false) }
    }

    const handleDeleteEducation = async (id: string) => {
        try {
            await deleteMyEducation(id)
            setProfile(prev => prev ? { ...prev, educations: prev.educations?.filter(e => e.id !== id) } : null)
            toast.success('Education deleted')
        } catch { toast.error('Failed to delete education') }
    }

    const handleAddJob = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddingJob(true)
        try {
            const job = await addMyJobExperience(newJob)
            setProfile(prev => prev ? { ...prev, job_experiences: [...(prev.job_experiences || []), job] } : null)
            setNewJob({ title: '', description: '' })
            toast.success('Experience added')
            // Refresh organizations map if a new org was used
            if (job.org_id && !orgsById[job.org_id]) {
                const org = await getOrganizationById(job.org_id)
                setOrgsById(prev => ({ ...prev, [org.id]: org }))
            }
        } catch { toast.error('Failed to add experience') } finally { setAddingJob(false) }
    }

    const handleDeleteJob = async (id: string) => {
        try {
            await deleteMyJobExperience(id)
            setProfile(prev => prev ? { ...prev, job_experiences: prev.job_experiences?.filter(j => j.id !== id) } : null)
            toast.success('Experience deleted')
        } catch { toast.error('Failed to delete experience') }
    }

    const handleCreateOrg = async () => {
        setCreatingOrg(true)
        try {
            const org = await createOrganization({ name: newOrgName.trim(), type: newOrgType, visibility: 'public' })
            setSelectedOrg(org)
            setNewJob({ ...newJob, org_id: org.id })
            setShowCreateOrg(false)
            setOrgSearch('')
            setOrgOptions([])
            setNewOrgName('')
            toast.success('Organization created')
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Failed to create organization')
        } finally {
            setCreatingOrg(false)
        }
    }


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-amber-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
            </div>
        )
    }

    if (!profile) return <div className="p-8 text-center text-zinc-900">Profile not found.</div>

    return (
        <div className="min-h-screen bg-amber-50">
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
                            {(viewFriends === 'followers' ? followers : following).length === 0 ? (
                                <div className="p-8 text-center text-zinc-400 italic">
                                    No {viewFriends} yet.
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {(viewFriends === 'followers' ? followers : following).map((item: any) => {
                                        const person = viewFriends === 'followers' ? item.follower : item.followee
                                        if (!person) return null
                                        return (
                                            <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-zinc-50 rounded-2xl transition-colors group text-left">
                                                <Link href={`/profile/${person.id}`} className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer">
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
                                                        <div className="font-bold text-zinc-900 truncate">{person.full_name}</div>
                                                        <div className="text-xs text-zinc-400 font-medium truncate">User</div>
                                                    </div>
                                                </Link>
                                                {viewFriends === 'following' && (
                                                    confirmUnfollowId === person.id ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setConfirmUnfollowId(null)
                                                                }}
                                                                className="px-3 py-1.5 rounded-full border border-gray-200 text-zinc-500 text-xs font-bold hover:bg-gray-100 transition-all animate-fadeIn"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation()
                                                                    try {
                                                                        await unfollowUser(person.id)
                                                                        setFollowing(prev => prev.filter(f => f.id !== item.id))
                                                                        toast.success(`Unfollowed ${person.full_name}`)
                                                                        setConfirmUnfollowId(null)
                                                                    } catch {
                                                                        toast.error('Failed to unfollow')
                                                                    }
                                                                }}
                                                                className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-md hover:bg-red-600 transition-all animate-fadeIn"
                                                            >
                                                                Confirm
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setConfirmUnfollowId(person.id)
                                                            }}
                                                            className="px-4 py-2 rounded-full border border-zinc-300 bg-white text-zinc-800 text-xs font-bold shadow-sm hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
                                                        >
                                                            Unfollow
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <ProfileHeader
                profile={profile}
                isOwnProfile={true}
                followersCount={followers.length}
                followingCount={following.length}
                onViewFollowers={() => setViewFriends('followers')}
                onViewFollowing={() => setViewFriends('following')}
                onEdit={() => setEditing(true)}
                onAvatarChange={handleAvatarChange}
                onCoverChange={handleCoverChange}
                avatarInputRef={avatarInputRef}
                coverInputRef={coverInputRef}
            />

            {!editing ? (
                <ProfileView
                    profile={profile}
                    userInfo={userInfo}
                    events={events}
                    historyEvents={historyEvents}
                    followers={followers}
                    following={following}
                    isOwnProfile={true}
                    onEdit={() => setEditing(true)}
                    orgsById={orgsById}
                    viewFriends={viewFriends}
                    setViewFriends={setViewFriends}
                />
            ) : (
                <ProfileEdit
                    formData={formData}
                    setFormData={setFormData}
                    profile={profile}
                    newEducation={newEducation}
                    setNewEducation={setNewEducation}
                    onAddEducation={handleAddEducation}
                    onDeleteEducation={handleDeleteEducation}
                    addingEdu={addingEdu}
                    newJob={newJob}
                    setNewJob={setNewJob}
                    onAddJob={handleAddJob}
                    onDeleteJob={handleDeleteJob}
                    addingJob={addingJob}
                    orgSearch={orgSearch}
                    setOrgSearch={setOrgSearch}
                    orgOptions={orgOptions}
                    orgLoading={orgLoading}
                    selectedOrg={selectedOrg}
                    setSelectedOrg={setSelectedOrg}
                    showCreateOrg={showCreateOrg}
                    setShowCreateOrg={setShowCreateOrg}
                    newOrgName={newOrgName}
                    setNewOrgName={setNewOrgName}
                    newOrgType={newOrgType}
                    setNewOrgType={setNewOrgType}
                    onCreateOrg={handleCreateOrg}
                    creatingOrg={creatingOrg}
                    availableTags={availableTags}
                    onTagToggle={handleTagToggle}
                    onCreateTag={handleCreateTag}
                    myTags={profile.tags || []}
                    onSave={handleSave}
                    onCancel={() => setEditing(false)}
                    saving={saving}
                />
            )}
        </div>
    )
}
