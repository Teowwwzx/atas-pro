'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { findProfiles, semanticSearchProfiles, semanticSearchEvents, getPublicOrganizations, getPublicProfiles } from '@/services/api'
import { ProfileResponse, EventDetails, OrganizationResponse } from '@/services/api.types'
import { debounce } from 'lodash'

interface SearchModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
    const [query, setQuery] = useState('')
    const [profiles, setProfiles] = useState<ProfileResponse[]>([])
    const [profilesBase, setProfilesBase] = useState<ProfileResponse[]>([])
    const [events, setEvents] = useState<EventDetails[]>([])
    const [orgs, setOrgs] = useState<OrganizationResponse[]>([])
    const [useAi, setUseAi] = useState(true)
    const [selectedDay, setSelectedDay] = useState<string>('')
    const [selectedTime, setSelectedTime] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [compareMode, setCompareMode] = useState(false)
    const router = useRouter()

    const parseDayTime = (text: string) => {
        const t = text.toLowerCase()
        const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
        const weekend = t.includes('weekend') || t.includes('weekends')
        const weekday = t.includes('weekday') || t.includes('weekdays')
        let day = ''
        for (const d of days) { if (t.includes(d)) { day = d; break } }
        if (!day && weekend) day = 'saturday'
        if (!day && weekday) day = 'monday'
        const m1 = /(\b\d{1,2}):(\d{2})\s*(am|pm)?\b/.exec(t)
        const m2 = /(\b\d{1,2})(\d{2})\s*(am|pm)\b/.exec(t)
        const m3 = /(\b\d{1,2})\s*(am|pm)\b/.exec(t)
        let hh = 0, mm = 0, ap: string | null = null
        if (m1) { hh = parseInt(m1[1],10); mm = parseInt(m1[2],10); ap = m1[3] || null }
        else if (m2) { hh = parseInt(m2[1],10); mm = parseInt(m2[2],10); ap = m2[3] }
        else if (m3) { hh = parseInt(m3[1],10); mm = 0; ap = m3[2] }
        let h24 = hh
        if (ap) { h24 = hh % 12; if (ap === 'pm') h24 += 12 }
        const time = (m1 || m2 || m3) ? `${String(h24).padStart(2,'0')}:${String(mm).padStart(2,'0')}` : ''
        return { day, time }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(
        debounce(async (q: string) => {
            if (!q.trim()) {
                setProfiles([])
                setEvents([])
                setOrgs([])
                setLoading(false)
                return
            }
            try {
                const [p, e, o] = await Promise.all([
                    semanticSearchProfiles({ q_text: q, top_k: 10 }),
                    semanticSearchEvents({ q_text: q, top_k: 10 }),
                    getPublicOrganizations({ q, page: 1, page_size: 10 })
                ])
                let filteredProfiles = (() => {
                    if (!useAi) return p as ProfileResponse[]
                    if (!selectedDay && !selectedTime) return p as ProfileResponse[]
                    const day = selectedDay.toLowerCase()
                    const time = selectedTime
                    const to24 = (t: string) => {
                        const m = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.exec(t)
                        if (!m) return null
                        const hh = parseInt(m[1], 10)
                        const mm = parseInt(m[2], 10)
                        return hh * 60 + mm
                    }
                    const timeMin = time ? to24(time) : null
                    const hasDay = !!day
                    const isWeekendDay = day === 'saturday' || day === 'sunday'
                    const isWeekdayDay = ['monday','tuesday','wednesday','thursday','friday'].includes(day)
                    const dayKeyMap: Record<string, string> = { monday: 'mon', tuesday: 'tue', wednesday: 'wed', thursday: 'thu', friday: 'fri', saturday: 'sat', sunday: 'sun' }
                    const dayAbbr = dayKeyMap[day] || ''
                    return (p as ProfileResponse[]).filter(pr => {
                        const avail = (pr.availability || '').toLowerCase()
                        const isFlexible = avail.includes('flexible') || avail.includes('tbd')
                        if (isFlexible && (!hasDay || timeMin == null)) return true
                        let dayOk = hasDay ? (avail.includes(day) || (!!dayAbbr && avail.includes(dayAbbr))) : true
                        if (hasDay) {
                            if (isWeekendDay && (avail.includes('weekend') || avail.includes('weekends'))) dayOk = true
                            if (isWeekdayDay && avail.includes('weekday')) dayOk = true
                        }
                        if (!dayOk) return false
                        if (timeMin == null) return dayOk
                        const re12 = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/g
                        const reNoColon = /(\d{1,2})(\d{2})\s*(am|pm)/g
                        const reAfter = /after\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/
                        let match
                        let anyTimeOk = false
                        while ((match = re12.exec(avail)) !== null) {
                            const hh = parseInt(match[1], 10)
                            const mm = match[2] ? parseInt(match[2], 10) : 0
                            const ap = match[3]
                            let h24 = hh % 12
                            if (ap === 'pm') h24 += 12
                            const mins = h24 * 60 + mm
                            if (Math.abs(mins - timeMin) <= 30) { anyTimeOk = true; break }
                        }
                        if (!anyTimeOk) {
                            let mnc
                            while ((mnc = reNoColon.exec(avail)) !== null) {
                                const hh = parseInt(mnc[1], 10)
                                const mm = parseInt(mnc[2], 10)
                                const ap = mnc[3]
                                let h24 = hh % 12
                                if (ap === 'pm') h24 += 12
                                const mins = h24 * 60 + mm
                                if (Math.abs(mins - timeMin) <= 30) { anyTimeOk = true; break }
                            }
                        }
                        if (!anyTimeOk) {
                            const m2 = reAfter.exec(avail)
                            if (m2) {
                                const hh = parseInt(m2[1], 10)
                                const mm = m2[2] ? parseInt(m2[2], 10) : 0
                                const ap = m2[3]
                                let h24 = hh % 12
                                if (ap === 'pm') h24 += 12
                                const mins = h24 * 60 + mm
                                if (timeMin >= mins) anyTimeOk = true
                            }
                        }
                        return anyTimeOk
                    })
                })()
                if (useAi && (selectedDay || selectedTime) && filteredProfiles.length === 0) {
                    try {
                        const fallbackAll = await getPublicProfiles()
                        filteredProfiles = fallbackAll.filter((pr: ProfileResponse) => {
                            const avail = (pr.availability || '').toLowerCase()
                            const to24 = (t: string) => {
                                const m = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.exec(t)
                                if (!m) return null
                                const hh = parseInt(m[1], 10)
                                const mm = parseInt(m[2], 10)
                                return hh * 60 + mm
                            }
                            const day = selectedDay.toLowerCase()
                            const timeMin = selectedTime ? to24(selectedTime) : null
                            const dayKeyMap: Record<string, string> = { monday: 'mon', tuesday: 'tue', wednesday: 'wed', thursday: 'thu', friday: 'fri', saturday: 'sat', sunday: 'sun' }
                            const dayAbbr = dayKeyMap[day] || ''
                            const isWeekendDay = day === 'saturday' || day === 'sunday'
                            const isWeekdayDay = ['monday','tuesday','wednesday','thursday','friday'].includes(day)
                            let dayOk = day ? (avail.includes(day) || (!!dayAbbr && avail.includes(dayAbbr)) || (isWeekendDay && (avail.includes('weekend') || avail.includes('weekends'))) || (isWeekdayDay && avail.includes('weekday'))) : true
                            if (!dayOk) return false
                            if (timeMin == null) return dayOk
                            const re12 = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/g
                            const reNoColon = /(\d{1,2})(\d{2})\s*(am|pm)/g
                            const reAfter = /after\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/
                            let match, ok = false
                            while ((match = re12.exec(avail)) !== null) {
                                const hh = parseInt(match[1], 10)
                                const mm = match[2] ? parseInt(match[2], 10) : 0
                                const ap = match[3]
                                let h24 = hh % 12
                                if (ap === 'pm') h24 += 12
                                const mins = h24 * 60 + mm
                                if (Math.abs(mins - timeMin) <= 30) { ok = true; break }
                            }
                            if (!ok) {
                                let mnc
                                while ((mnc = reNoColon.exec(avail)) !== null) {
                                    const hh = parseInt(mnc[1], 10)
                                    const mm = parseInt(mnc[2], 10)
                                    const ap = mnc[3]
                                    let h24 = hh % 12
                                    if (ap === 'pm') h24 += 12
                                    const mins = h24 * 60 + mm
                                    if (Math.abs(mins - timeMin) <= 30) { ok = true; break }
                                }
                            }
                            if (!ok) {
                                const m2 = reAfter.exec(avail)
                                if (m2) {
                                    const hh = parseInt(m2[1], 10)
                                    const mm = m2[2] ? parseInt(m2[2], 10) : 0
                                    const ap = m2[3]
                                    let h24 = hh % 12
                                    if (ap === 'pm') h24 += 12
                                    const mins = h24 * 60 + mm
                                    if (timeMin >= mins) ok = true
                                }
                            }
                            return ok
                        })
                    } catch {
                        // keep filteredProfiles as-is
                    }
                }
                if (compareMode) {
                    try {
                        const base = await findProfiles({ name: q })
                        setProfilesBase(base as ProfileResponse[])
                    } catch {
                        setProfilesBase([])
                    }
                } else {
                    setProfilesBase([])
                }
                setProfiles(filteredProfiles)
                setEvents(e as EventDetails[])
                setOrgs(o as OrganizationResponse[])
            } catch (error) {
                console.error('Search failed', error)
                setProfiles([])
                setEvents([])
                setOrgs([])
                setProfilesBase([])
            } finally {
                setLoading(false)
            }
        }, 300),
        [useAi, compareMode, selectedDay, selectedTime]
    )

    useEffect(() => {
        if (open) {
            // Focus input when opened? autoFocus prop on input usually works
        } else {
            setQuery('')
            setProfiles([])
            setEvents([])
            setOrgs([])
        }
    }, [open])

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setQuery(val)
        setLoading(true)
        debouncedSearch(val)
    }

    const handleSelectProfile = (userId: string) => {
        onOpenChange(false)
        router.push(`/profile/${userId}`)
    }

    const handleSelectEvent = (eventId: string) => {
        onOpenChange(false)
        router.push(`/events/${eventId}`)
    }

    const handleSelectOrg = (orgId: string) => {
        onOpenChange(false)
        router.push(`/organizations/${orgId}`)
    }

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-[20%] -translate-x-1/2 w-[90vw] max-w-2xl bg-white rounded-2xl shadow-2xl z-[70] overflow-hidden flex flex-col border border-zinc-100">
                    <Dialog.Title className="sr-only">Search</Dialog.Title>
                    <div className="p-4 border-b border-zinc-100 flex items-center gap-3">
                        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            className="flex-1 text-lg bg-transparent border-none focus:ring-0 placeholder-zinc-400 text-zinc-900 font-medium"
                            placeholder="Search people, events, organizations..."
                            value={query}
                            onChange={handleSearch}
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setUseAi(!useAi)}
                                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${useAi ? 'bg-green-500 border-green-500 text-white' : 'bg-zinc-50 border-zinc-300 text-transparent hover:border-yellow-400'}`}
                                aria-pressed={useAi}
                                aria-label="Toggle AI search"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </button>
                            <span className="text-xs font-bold text-zinc-700">AI</span>
                            <button
                                onClick={() => {
                                    const { day, time } = parseDayTime(query)
                                    setUseAi(true)
                                    setSelectedDay(day)
                                    setSelectedTime(time)
                                    setLoading(true)
                                    debouncedSearch(query)
                                }}
                                className={`px-2 h-7 rounded-lg border-2 text-xs font-bold transition-all ${'bg-indigo-50 border-indigo-300 text-indigo-700 hover:border-indigo-400'}`}
                            >
                                AI Match
                            </button>
                            <button
                                onClick={() => setCompareMode(!compareMode)}
                                className={`px-2 h-7 rounded-lg border-2 text-xs font-bold transition-all ${compareMode ? 'bg-yellow-400 border-yellow-400 text-black' : 'bg-zinc-50 border-zinc-300 text-zinc-700 hover:border-yellow-400'}`}
                                aria-pressed={compareMode}
                            >
                                Compare
                            </button>
                            {useAi && (
                                <>
                                    <select
                                        value={selectedDay}
                                        onChange={(e) => setSelectedDay(e.target.value)}
                                        className="text-xs font-bold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1"
                                    >
                                        <option value="">Any Day</option>
                                        <option value="monday">Monday</option>
                                        <option value="tuesday">Tuesday</option>
                                        <option value="wednesday">Wednesday</option>
                                        <option value="thursday">Thursday</option>
                                        <option value="friday">Friday</option>
                                        <option value="saturday">Saturday</option>
                                        <option value="sunday">Sunday</option>
                                    </select>
                                    <input
                                        type="time"
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(e.target.value)}
                                        className="text-xs font-bold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1"
                                    />
                                </>
                            )}
                        </div>
                        <button onClick={() => onOpenChange(false)} className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400 transition-colors">
                            <span className="sr-only">Close</span>
                            <kbd className="hidden sm:inline-block text-xs font-mono bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 text-zinc-500">ESC</kbd>
                        </button>
                    </div>
                    
                    {(loading || profiles.length > 0 || events.length > 0 || orgs.length > 0 || query) && (
                        <div className="max-h-[60vh] overflow-y-auto p-2">
                            {loading ? (
                                <div className="p-4 text-center text-zinc-500 text-sm">Searching...</div>
                            ) : (
                                <div className="space-y-6">
                                    {!compareMode && profiles.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">People</div>
                                            {profiles.map((profile) => (
                                                <button
                                                    key={profile.id}
                                                    onClick={() => handleSelectProfile(profile.user_id)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-yellow-50 rounded-xl transition-colors text-left group"
                                                >
                                                    {profile.avatar_url ? (
                                                        <Image src={profile.avatar_url} alt="" width={40} height={40} className="rounded-full object-cover ring-2 ring-white group-hover:ring-yellow-200" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold ring-2 ring-white group-hover:ring-yellow-200">
                                                            {profile.full_name?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-zinc-900">{profile.full_name}</div>
                                                        {profile.bio && <div className="text-xs text-zinc-500 truncate max-w-sm">{profile.bio}</div>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {compareMode && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <div className="px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">AI Matched ({profiles.length})</div>
                                                {profiles.map((profile) => (
                                                    <button
                                                        key={profile.id}
                                                        onClick={() => handleSelectProfile(profile.user_id)}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-yellow-50 rounded-xl transition-colors text-left group"
                                                    >
                                                        {profile.avatar_url ? (
                                                            <Image src={profile.avatar_url} alt="" width={40} height={40} className="rounded-full object-cover ring-2 ring-white group-hover:ring-yellow-200" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold ring-2 ring-white group-hover:ring-yellow-200">
                                                                {profile.full_name?.charAt(0) || 'U'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-zinc-900">{profile.full_name}</div>
                                                            {profile.bio && <div className="text-xs text-zinc-500 truncate max-w-sm">{profile.bio}</div>}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">Non-AI ({profilesBase.length})</div>
                                                {profilesBase.map((profile) => (
                                                    <button
                                                        key={profile.id}
                                                        onClick={() => handleSelectProfile(profile.user_id)}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 rounded-xl transition-colors text-left group"
                                                    >
                                                        {profile.avatar_url ? (
                                                            <Image src={profile.avatar_url} alt="" width={40} height={40} className="rounded-full object-cover ring-2 ring-white group-hover:ring-yellow-200" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold ring-2 ring-white group-hover:ring-yellow-200">
                                                                {profile.full_name?.charAt(0) || 'U'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-zinc-900">{profile.full_name}</div>
                                                            {profile.bio && <div className="text-xs text-zinc-500 truncate max-w-sm">{profile.bio}</div>}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {events.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">Events</div>
                                            {events.map((event) => (
                                                <button
                                                    key={event.id}
                                                    onClick={() => handleSelectEvent(event.id)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-yellow-50 rounded-xl transition-colors text-left group"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold ring-2 ring-white group-hover:ring-yellow-200">
                                                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H5a2 2 0 00-2 2v9a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 00-1-1H6zm0 4h8v2H6V6z"/></svg>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-zinc-900">{event.title}</div>
                                                        {event.venue_remark && <div className="text-xs text-zinc-500 truncate max-w-sm">{event.venue_remark}</div>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {orgs.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">Organizations</div>
                                            {orgs.map((org) => (
                                                <button
                                                    key={org.id}
                                                    onClick={() => handleSelectOrg(org.id)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-yellow-50 rounded-xl transition-colors text-left group"
                                                >
                                                    {org.logo_url ? (
                                                        <Image src={org.logo_url} alt="logo" width={40} height={40} className="rounded-lg object-cover ring-2 ring-white group-hover:ring-yellow-200" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold ring-2 ring-white group-hover:ring-yellow-200">
                                                            {org.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-zinc-900">{org.name}</div>
                                                        {org.type && <div className="text-xs text-zinc-500 truncate max-w-sm">{org.type}</div>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {!profiles.length && !events.length && !orgs.length && query && (
                                        <div className="p-8 text-center text-zinc-500">
                                            No results found for {query}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {!query && !loading && (
                        <div className="p-8 text-center text-zinc-400 text-sm">
                            Type to search for people, events, and organizations.
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
