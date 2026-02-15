'use client'

import React from 'react'
import { MyEventItem } from '@/services/api.types'

interface DashboardStatsProps {
    events: MyEventItem[]
}

export function DashboardStats({ events }: DashboardStatsProps) {
    const [now, setNow] = React.useState(Date.now())

    React.useEffect(() => {
        // Update time on mount to avoid hydration mismatch
        setNow(Date.now())
    }, [])

    const total = events.length
    const upcoming = events.filter(e => new Date(e.end_datetime).getTime() > now && e.status !== 'ended').length
    const completed = events.filter(e => e.status === 'ended' || new Date(e.end_datetime).getTime() < now).length
    const organized = events.filter(e => e.my_role === 'organizer').length

    const stats = [
        { name: 'Total Events', value: total, color: 'bg-blue-50 text-blue-700' },
        { name: 'Upcoming', value: upcoming, color: 'bg-yellow-50 text-yellow-700' },
        { name: 'Completed', value: completed, color: 'bg-green-50 text-green-700' },
        { name: 'Organized', value: organized, color: 'bg-purple-50 text-purple-700' },
    ]

    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
            {stats.map((stat) => (
                <div key={stat.name} className="bg-white overflow-hidden rounded-2xl border border-zinc-100 shadow-sm p-5 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
                    <dt className="truncate text-sm font-medium text-zinc-500">{stat.name}</dt>
                    <dd className={`mt-2 text-3xl font-black rounded-xl px-4 py-1 ${stat.color}`}>
                        {stat.value}
                    </dd>
                </div>
            ))}
        </div>
    )
}
