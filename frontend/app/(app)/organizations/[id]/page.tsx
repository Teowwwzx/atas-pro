'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getOrganizationById, getMe, updateOrganization, updateOrganizationLogo, updateOrganizationCover, getPublicEvents, getReviewsByEvent, getOrganizationMembers, getMyOrganizationMembership, joinOrganization, leaveOrganization, followOrganization, unfollowOrganization, getMyOrganizationFollowStatus, getOrganizationFollowers } from '@/services/api'
import { OrganizationResponse, UserMeResponse, OrganizationUpdate, EventDetails, FollowDetails } from '@/services/api.types'
import { EventCard } from '@/components/ui/EventCard'
import { toast } from 'react-hot-toast'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'


export default function OrganizationDetailPage() {
  const params = useParams()
  const orgId = params.id as string

  const [org, setOrg] = useState<OrganizationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<UserMeResponse | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [form, setForm] = useState<OrganizationUpdate>({})
  const [files, setFiles] = useState<{ logo: File | null; cover: File | null }>({ logo: null, cover: null })
  const logoRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const [relatedEvents, setRelatedEvents] = useState<EventDetails[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventReviews, setEventReviews] = useState<Record<string, { averageRating: number; reviewsCount: number; latestComment?: string }>>({})
  const [myMembership, setMyMembership] = useState<{ is_member: boolean; role?: string | null } | null>(null)
  const [members, setMembers] = useState<{ user_id: string; role: string }[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [followers, setFollowers] = useState<FollowDetails[]>([])
  const [followersLoading, setFollowersLoading] = useState(false)

  const [activeTab, setActiveTab] = useState('Overview')

  const isOwner = !!(me && org && me.id === org.owner_id)

  const tabs = ['Overview']
  if (relatedEvents.length > 0) tabs.push('Events')
  if (members.length > 0) tabs.push('People')

  // Reset active tab if it disappears
  useEffect(() => {
    if (!tabs.includes(activeTab) && activeTab !== 'Overview') {
      setActiveTab('Overview')
    }
  }, [tabs.join(','), activeTab])

  useEffect(() => {
    if (!orgId) return
    const run = async () => {
      try {
        const [data, user] = await Promise.all([
          getOrganizationById(orgId),
          getMe().catch(() => null)
        ])
        setOrg(data)
        setMe(user)
        setForm({
          name: data.name,
          description: data.description || '',
          type: data.type,
          website_url: data.website_url || '',
          location: data.location || '',
          visibility: data.visibility,
        })
      } catch (error: unknown) {
        const e = error as { response?: { status?: number; data?: { detail?: string } } }
        if (e.response?.status === 401) {
          localStorage.removeItem('atas_token')
          window.location.href = '/login'
          return
        }
        const msg = e.response?.data?.detail || 'Failed to load organization'
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [orgId])

  useEffect(() => {
    const loadRelatedEvents = async () => {
      if (!org?.owner_id) return
      try {
        setEventsLoading(true)
        const events = await getPublicEvents()
        const hosted = events.filter(e => e.organizer_id === org.owner_id)
        setRelatedEvents(hosted)
      } catch {
        setRelatedEvents([])
      } finally {
        setEventsLoading(false)
      }
    }
    loadRelatedEvents()
  }, [org?.owner_id])

  useEffect(() => {
    const loadReviews = async () => {
      if (!relatedEvents.length) return
      try {
        const results = await Promise.all(relatedEvents.map(async (ev) => {
          try {
            const reviews = await getReviewsByEvent(ev.id)
            const count = reviews.length
            const avg = count > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / count : 0
            const latest = reviews.find(r => !!r.comment)?.comment || undefined
            return [ev.id, { averageRating: Number(avg.toFixed(1)), reviewsCount: count, latestComment: latest }] as const
          } catch {
            return [ev.id, { averageRating: 0, reviewsCount: 0 }] as const
          }
        }))
        setEventReviews(Object.fromEntries(results))
      } catch { }
    }
    loadReviews()
  }, [relatedEvents])

  useEffect(() => {
    const loadMembership = async () => {
      if (!org?.id) return
      try {
        const status = await getMyOrganizationMembership(org.id)
        setMyMembership(status)
      } catch {
        setMyMembership(null)
      }
    }
    loadMembership()
  }, [org?.id])

  useEffect(() => {
    const loadMembers = async () => {
      if (!org?.id) return
      try {
        setMembersLoading(true)
        const list = await getOrganizationMembers(org.id)
        setMembers(list)
      } catch {
        setMembers([])
      } finally {
        setMembersLoading(false)
      }
    }
    loadMembers()
  }, [org?.id])

  // Load Follow Status & Count
  useEffect(() => {
    if (!org?.id) return

    // 1. Get Count
    getOrganizationFollowers(org.id)
      .then(res => setFollowersCount(res.length))
      .catch(() => setFollowersCount(0))

    // 2. Get My Status
    if (me) {
      getMyOrganizationFollowStatus(org.id)
        .then(res => setIsFollowing(res.is_following))
        .catch(() => setIsFollowing(false))
    }
  }, [org?.id, me])

  if (loading) return <div className="text-sm text-zinc-500">Loading...</div>
  if (error) return <div className="text-sm text-red-600">{error}</div>
  if (!org) return <div className="text-sm text-zinc-500">Organization not found.</div>


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }))
    }
  }

  const handleClearFile = (type: 'logo' | 'cover') => {
    setFiles(prev => ({ ...prev, [type]: null }))
    if (type === 'logo' && logoRef.current) logoRef.current.value = ''
    if (type === 'cover' && coverRef.current) coverRef.current.value = ''
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const updated = await updateOrganization(org.id, form)

      const uploadPromises = []
      if (files.logo) {
        uploadPromises.push(updateOrganizationLogo(org.id, files.logo)
          .catch((e: any) => { console.error('Logo upload failed', e); toast.error('Logo upload failed'); }))
      }
      if (files.cover) {
        uploadPromises.push(updateOrganizationCover(org.id, files.cover)
          .catch((e: any) => { console.error('Cover upload failed', e); toast.error('Cover upload failed'); }))
      }

      // Wait for all uploads
      // If uploads succeed, they return updated org. We should probably refresh org from the last successful one or just refetch or rely on `updated` if only images changed.
      // But updateOrganization returns org too.
      // We can take the result of the last successful promise as the final org state, or just merge/reload.
      // Simplest: use results if available.
      const results = await Promise.all(uploadPromises)
      const lastResult = results.filter(Boolean).pop()

      setOrg(lastResult || updated)
      toast.success('Organization updated')
      setIsEditing(false)
      setFiles({ logo: null, cover: null })
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update organization')
    }
  }

  // Follow Action
  const handleFollowToggle = async () => {
    if (!org || !me) return
    try {
      if (isFollowing) {
        await unfollowOrganization(org.id)
        setIsFollowing(false)
        setFollowersCount(c => Math.max(0, c - 1))
        toast.success('Unfollowed organization')
      } else {
        await followOrganization(org.id)
        setIsFollowing(true)
        setFollowersCount(c => c + 1)
        toast.success('Following organization')
      }
    } catch (e: any) {
      toast.error('Failed to update follow status')
    }
  }

  // Load Followers
  const loadFollowers = async () => {
    if (!org) return
    setFollowersLoading(true)
    try {
      const data = await getOrganizationFollowers(org.id)
      setFollowers(data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load followers')
      setFollowers([])
    } finally {
      setFollowersLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 sm:px-6">
      {/* Modern Header Design */}
      <div className="relative mb-10">
        {/* Cover Image */}
        <div className="h-48 md:h-64 w-full rounded-3xl overflow-hidden relative shadow-sm bg-zinc-100 group">
          {org.cover_url ? (
            <img src={org.cover_url} alt="cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-yellow-50 to-orange-50"></div>
          )}
          {isOwner && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-2.5 rounded-full shadow-sm hover:bg-white text-zinc-700 transition-all opacity-0 group-hover:opacity-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
          )}
        </div>

        {/* Profile Info Bar */}
        <div className="px-2 md:px-6 relative -mt-10 md:-mt-12 flex flex-col md:flex-row items-start md:items-end gap-6">
          {/* Logo */}
          <div className="bg-white p-1.5 rounded-2xl shadow-lg shrink-0 relative z-10">
            {org.logo_url ? (
              <img src={org.logo_url} alt="logo" className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover bg-white border border-zinc-100" />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-zinc-50 flex items-center justify-center text-4xl font-black text-zinc-300 border border-zinc-100">
                {org.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Info & Actions */}
          <div className="flex-1 w-full md:w-auto pt-2 md:pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight">{org.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-zinc-500 mt-2">
                {org.type && <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 capitalize">{org.type}</span>}
                {org.location && <span className="flex items-center gap-1"><svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{org.location}</span>}
                <button
                  onClick={() => {
                    setShowFollowersModal(true)
                    loadFollowers()
                  }}
                  className="text-yellow-600 font-bold hover:underline cursor-pointer"
                >
                  {followersCount} followers
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {org.website_url && (
                <a
                  href={org.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
                  title="Visit Website"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}

              {me && !isOwner && (
                <>
                  {isFollowing ? (
                    <button
                      onClick={handleFollowToggle}
                      className="px-6 py-2 rounded-full bg-zinc-100 text-zinc-900 text-sm font-bold hover:bg-zinc-200 transition-colors"
                    >
                      Following
                    </button>
                  ) : (
                    <button
                      onClick={handleFollowToggle}
                      className="px-6 py-2 rounded-full bg-yellow-500 text-white text-sm font-bold hover:bg-yellow-600 transition-colors shadow-lg shadow-yellow-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      Follow
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {isEditing ? (
        <div className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 border border-zinc-100 p-8 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-zinc-900">Edit Organization</h2>
            <button onClick={() => setIsEditing(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2">Update Logo</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    ref={logoRef}
                    onChange={e => handleFileChange(e, 'logo')}
                    className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                  />
                  {files.logo && (
                    <button
                      type="button"
                      onClick={() => handleClearFile('logo')}
                      className="text-red-500 hover:text-red-700 p-2"
                      title="Remove file"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2">Update Cover</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    ref={coverRef}
                    onChange={e => handleFileChange(e, 'cover')}
                    className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                  />
                  {files.cover && (
                    <button
                      type="button"
                      onClick={() => handleClearFile('cover')}
                      className="text-red-500 hover:text-red-700 p-2"
                      title="Remove file"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-900 mb-2">Name</label>
              <input
                name="name"
                value={form.name || ''}
                onChange={handleChange}
                className="text-gray-700 block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-500 focus:ring-0 py-3.5 px-5 font-medium transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-900 mb-2">Description</label>
              <textarea
                name="description"
                value={form.description || ''}
                onChange={handleChange}
                rows={4}
                className="text-gray-700 block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-500 focus:ring-0 py-3.5 px-5 font-medium transition-all"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2">Type</label>
                <select
                  name="type"
                  value={form.type || 'community'}
                  onChange={handleChange}
                  className="text-gray-700 block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-500 focus:ring-0 py-3.5 px-5 font-medium transition-all"
                >
                  <option value="company">Company</option>
                  <option value="university">University</option>
                  <option value="community">Community</option>
                  <option value="nonprofit">Nonprofit</option>
                  <option value="government">Government</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2">Visibility</label>
                <select
                  name="visibility"
                  value={form.visibility || 'public'}
                  onChange={handleChange}
                  className="text-gray-700 block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-500 focus:ring-0 py-3.5 px-5 font-medium transition-all"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2">Website</label>
                <input
                  name="website_url"
                  value={form.website_url || ''}
                  onChange={handleChange}
                  className="text-gray-700 block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-500 focus:ring-0 py-3.5 px-5 font-medium transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2">Location</label>
                <input
                  name="location"
                  value={form.location || ''}
                  onChange={handleChange}
                  className="text-gray-700 block w-full rounded-2xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-500 focus:ring-0 py-3.5 px-5 font-medium transition-all"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 bg-white text-zinc-900 rounded-full font-bold shadow-sm hover:bg-gray-50 border border-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-2.5 bg-yellow-500 text-white rounded-full font-bold shadow-lg shadow-yellow-200 hover:bg-yellow-600 transition-all"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-8 border-b border-zinc-100 mb-8 overflow-x-auto no-scrollbar px-2">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap px-1 ${activeTab === tab ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content (Left 2/3) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Overview Tab Content */}
              {activeTab === 'Overview' && (
                <>
                  <div className="space-y-4">
                    <h3 className="font-bold text-zinc-900 text-lg">About</h3>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100">
                      <p className="text-zinc-600 whitespace-pre-wrap leading-relaxed">{org.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  {/* Show Recent Events in Overview if available */}
                  {relatedEvents.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-zinc-900 text-lg">Upcoming Events</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {relatedEvents.slice(0, 2).map(event => (
                          <EventCard key={event.id} event={event} compact reviewsSummary={eventReviews[event.id]} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Events Tab */}
              {activeTab === 'Events' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-900 text-lg">All Events</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {relatedEvents.map(event => (
                      <EventCard key={event.id} event={event} compact reviewsSummary={eventReviews[event.id]} />
                    ))}
                  </div>
                </div>
              )}

              {/* People Tab */}
              {activeTab === 'People' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-900 text-lg">People</h3>
                  <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
                    {membersLoading ? (
                      <div className="text-center py-8 text-zinc-400">Loading members...</div>
                    ) : members.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {members.map((member: any) => {
                          const isPublic = member.visibility === 'public'

                          const memberContent = (
                            <>
                              {member.avatar_url ? (
                                <img
                                  src={member.avatar_url}
                                  alt={member.full_name}
                                  className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-700 font-bold border border-green-100">
                                  {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-zinc-900 text-sm truncate">
                                  {member.full_name || 'Unknown User'}
                                </div>
                                {member.title && (
                                  <div className="text-xs text-zinc-500 truncate">{member.title}</div>
                                )}
                                <div className="text-xs text-zinc-400 capitalize flex items-center gap-2 mt-0.5">
                                  <span>{member.role}</span>
                                  {!isPublic && (
                                    <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded">Private</span>
                                  )}
                                </div>
                              </div>
                              {isPublic && (
                                <svg className="w-4 h-4 text-zinc-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </>
                          )

                          return isPublic ? (
                            <Link
                              key={member.user_id}
                              href={`/profiles/${member.user_id}`}
                              className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:bg-zinc-50 hover:border-zinc-200 cursor-pointer transition-colors"
                            >
                              {memberContent}
                            </Link>
                          ) : (
                            <div
                              key={member.user_id}
                              className="flex items-center gap-3 p-3 rounded-xl border border-transparent opacity-75"
                            >
                              {memberContent}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-zinc-400">No members yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar (Right 1/3) */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
                <h3 className="font-bold text-zinc-900 mb-4 text-sm uppercase tracking-wider text-zinc-400">Details</h3>
                <div className="space-y-5 text-sm">
                  {!!org.website_url && (
                    <div>
                      <div className="text-zinc-400 font-bold mb-1 text-xs">Website</div>
                      <a href={org.website_url} target="_blank" rel="noreferrer" className="text-yellow-600 font-bold hover:underline break-all block">{org.website_url}</a>
                    </div>
                  )}
                  {!!org.location && (
                    <div>
                      <div className="text-zinc-400 font-bold mb-1 text-xs">Location</div>
                      <div className="text-zinc-900 font-medium">{org.location}</div>
                    </div>
                  )}
                  {!!org.type && (
                    <div>
                      <div className="text-zinc-400 font-bold mb-1 text-xs">Industry</div>
                      <div className="text-zinc-900 capitalize font-medium">{org.type}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-zinc-400 font-bold mb-1 text-xs">Founded</div>
                    <div className="text-zinc-900 font-medium">{new Date(org.created_at || Date.now()).getFullYear()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Followers Modal */}
      <Transition appear show={showFollowersModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowFollowersModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all">
                  <div className="border-b border-zinc-100 px-6 py-5 flex items-center justify-between bg-zinc-50/50">
                    <Dialog.Title as="h3" className="text-xl font-black text-zinc-900">
                      Followers
                    </Dialog.Title>
                    <button
                      onClick={() => setShowFollowersModal(false)}
                      className="text-zinc-400 hover:text-zinc-600 transition-colors p-2 hover:bg-zinc-100 rounded-full"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                    {followersLoading ? (
                      <div className="text-center py-12 text-zinc-400">Loading followers...</div>
                    ) : followers.length === 0 ? (
                      <div className="text-center py-12 text-zinc-400">No followers yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {followers.map((item: FollowDetails) => {
                          // The item is a FollowDetails object from backend
                          // item.follower contains the User summary of the person following
                          const user = item.follower

                          // Filter out private users or missing user data
                          if (!user) return null
                          if (user.visibility === 'private') return null

                          const displayName = user.full_name
                          const avatarUrl = user.avatar_url
                          const linkPath = `/profile/${user.id}`

                          return (
                            <div key={item.id} className="p-4 rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/50 transition-all">
                              <div className="flex items-start gap-4">
                                <Link href={linkPath}>
                                  {avatarUrl ? (
                                    <img src={avatarUrl} alt={displayName || 'Avatar'} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                                  ) : (
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center font-black text-zinc-700 text-lg border-2 border-white shadow-sm">
                                      {(displayName || '?').charAt(0)}
                                    </div>
                                  )}
                                </Link>

                                <div className="flex-1 min-w-0">
                                  <Link href={linkPath} className="font-bold text-zinc-900 hover:text-yellow-600 transition-colors text-base block">
                                    {displayName || 'Unknown'}
                                  </Link>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}