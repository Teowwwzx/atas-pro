'use client'

import React, { useState } from 'react'
import { Tab } from '@headlessui/react'
import { EventDetails, ProfileResponse } from '@/services/api.types'
import { EventInviteModal } from './EventInviteModal'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import { DashboardTabChecklist } from './DashboardTabChecklist'
import { DashboardTabOverview } from './DashboardTabOverview'
import { DashboardTabPeople } from './DashboardTabPeople'
import { DashboardTabSettings } from './DashboardTabSettings'
import { DashboardTabReviews } from './DashboardTabReviews'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { getNotifications, NotificationItem } from '@/services/api'
import { EventPhase } from '@/lib/eventPhases'

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

interface DashboardTabsProps {
    event: EventDetails
    user: ProfileResponse | null
    role?: string | null
    phase: EventPhase // Add phase prop
    onUpdate: () => void // Callback to refresh parent data
    onDelete: () => void // Callback when event is deleted
}

export function DashboardTabs({ event, user, role, phase, onUpdate, onDelete }: DashboardTabsProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [refreshPeople, setRefreshPeople] = useState(0)

    // Navigation Logic
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const currentTab = searchParams.get('tab') || 'Overview'

    // Notifications Logic (Simple polling or fetch once)
    const [notifications, setNotifications] = useState<NotificationItem[]>([])

    React.useEffect(() => {
        getNotifications().then(setNotifications).catch(console.error)
    }, [])

    const isOrganizer = user?.user_id === event.organizer_id
    const isCommittee = role === 'committee'
    const canViewProposals = isOrganizer || ['committee', 'speaker', 'sponsor'].includes(role || '')

    const allTabs = [
        { name: 'Overview', id: 'overview' },
        { name: 'People', id: 'people', hidden: !(isOrganizer || isCommittee) },
        { name: 'Checklist', id: 'checklist', hidden: !(isOrganizer || isCommittee) }, // Only organizer/committee
        { name: 'Settings', id: 'settings', hidden: !(isOrganizer || isCommittee) }, // Organizer/committee
        { name: 'Reviews', id: 'reviews', hidden: !(isOrganizer || isCommittee) }, // Only organizer/committee
    ]

    const tabs = allTabs.filter(t => !t.hidden)

    // Find index of current tab
    const selectedIndex = tabs.findIndex(t => t.id.toLowerCase() === currentTab.toLowerCase())
    const safeIndex = selectedIndex >= 0 ? selectedIndex : 0

    const handleTabChange = (index: number) => {
        const tab = tabs[index]
        router.push(`${pathname}?tab=${tab.id}`, { scroll: false })
    }

    // Badge Logic
    const getBadgeCount = (tabId: string) => {
        return notifications.filter(n => {
            if (n.read) return false
            const link = n.link || ''
            if (link.includes(`eventId=${event.id}`)) {
                if (tabId === 'files' && (n.type === 'chat' || link.includes('tab=proposals'))) return true
                if (tabId === 'people' && link.includes('tab=people')) return true
            }
            return false
        }).length
    }

    return (
        <div className="bg-white rounded-b-[2.5rem] shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
            <Tab.Group selectedIndex={safeIndex} onChange={handleTabChange}>
                <div className="border-b border-zinc-100 px-8">
                    <Tab.List className="-mb-px flex space-x-8 overflow-x-auto scroller-none">
                        {tabs.map((tab) => {
                            const count = getBadgeCount(tab.id)
                            return (
                                <Tab
                                    key={tab.name}
                                    className={({ selected }) =>
                                        classNames(
                                            selected
                                                ? 'border-yellow-400 text-zinc-900'
                                                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300',
                                            'whitespace-nowrap py-6 px-1 border-b-4 font-bold text-sm focus:outline-none transition-colors flex items-center gap-2'
                                        )
                                    }
                                >
                                    {tab.name}
                                    {count > 0 && (
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                        </span>
                                    )}
                                </Tab>
                            )
                        })}
                    </Tab.List>
                </div>

                <Tab.Panels className="flex-1 p-6 md:p-8 bg-zinc-50/50">

                    {/* 1. Overview Tab */}
                    {
                        !allTabs[0].hidden && (
                            <Tab.Panel className="focus:outline-none animate-fadeIn">
                                {/* Pass role to Overview */}
                                <DashboardTabOverview event={event} user={user} role={role} phase={phase} onUpdate={onUpdate} />
                            </Tab.Panel>
                        )
                    }

                    {/* 2. People Tab */}
                    {
                        !allTabs[1].hidden && (
                            <Tab.Panel className="focus:outline-none animate-fadeIn">
                                <DashboardTabPeople
                                    event={event}
                                    user={user}
                                    phase={phase}
                                    onInvite={() => setIsInviteOpen(true)}
                                    key={refreshPeople} // Force refresh when people change
                                />
                            </Tab.Panel>
                        )
                    }

                    {/* 3. Checklist Tab (Files integrated here) */}
                    {
                        !allTabs[2].hidden && (
                            <Tab.Panel className="focus:outline-none">
                                <DashboardTabChecklist event={event} />
                            </Tab.Panel>
                        )
                    }

                    {/* 4. Settings Tab */}
                    {
                        !allTabs[3].hidden && (
                            <Tab.Panel className="focus:outline-none">
                                <DashboardTabSettings event={event} user={user} role={role} onUpdate={onUpdate} onDelete={onDelete} />
                            </Tab.Panel>
                        )
                    }

                    {/* 5. Reviews Tab */}
                    {
                        !allTabs.find(t => t.id === 'reviews')?.hidden && (
                            <Tab.Panel className="focus:outline-none">
                                <DashboardTabReviews event={event} />
                            </Tab.Panel>
                        )
                    }

                </Tab.Panels >
            </Tab.Group >


            <EventInviteModal
                isOpen={isInviteOpen}
                onClose={() => setIsInviteOpen(false)}
                eventId={event.id}
                eventTitle={event.title}
                onSuccess={() => setRefreshPeople(prev => prev + 1)}
            />
        </div >
    )
}
