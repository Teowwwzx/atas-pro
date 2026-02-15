'use client'

import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import {
    PersonIcon,
    BackpackIcon,
    ReaderIcon,
    ClockIcon,
    CheckCircledIcon,
    ExclamationTriangleIcon
} from '@radix-ui/react-icons'
import Link from 'next/link'
import { StatsCard } from '@/components/admin/StatsCard'
import { format } from 'date-fns'

export default function AdminDashboardPage() {
    const { data: stats, error, isLoading } = useSWR('admin-stats', async () => {
        return adminService.getStats()
    })

    const { data: expertPending } = useSWR('expert-pending-count', async () => {
        return adminService.getUsersCount({ role: 'expert_pending' })
    })

    const { data: sponsorPending } = useSWR('sponsor-pending-count', async () => {
        return adminService.getUsersCount({ role: 'sponsor_pending' })
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block">
                    Error loading dashboard stats. Please try refreshing.
                </div>
            </div>
        )
    }

    const today = new Date()

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-gray-500 mt-1 font-medium">
                        Welcome back! Here's what's happening today, {format(today, 'EEEE, d MMMM yyyy')}.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/admin/users?role=expert_pending"
                        className="flex items-center px-4 py-2 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 transition-all hover:-translate-y-0.5"
                    >
                        <CheckCircledIcon className="w-4 h-4 mr-2" />
                        Review Pending
                    </Link>
                </div>
            </div>

            {/* Platform Stats */}
            <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Platform Stats</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        name="Total Users"
                        value={stats?.total_users}
                        icon={PersonIcon}
                        bg="bg-blue-500/10"
                        text="text-blue-600"
                    />
                    <StatsCard
                        name="Organizations"
                        value={stats?.total_organizations}
                        icon={BackpackIcon}
                        bg="bg-purple-500/10"
                        text="text-purple-600"
                    />
                    <StatsCard
                        name="Total Logs"
                        value={stats?.total_audit_logs}
                        icon={ReaderIcon}
                        bg="bg-orange-500/10"
                        text="text-orange-600"
                    />
                    <StatsCard
                        name="Pending Approvals"
                        value={stats?.pending_approvals}
                        icon={ExclamationTriangleIcon}
                        bg="bg-yellow-500/10"
                        text="text-yellow-600"
                        trend="Action required"
                    />
                </div>
            </div>

            {/* Action Required Section */}
            <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Pending Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Expert Requests</p>
                                <h3 className="text-3xl font-black text-gray-900 mt-1">{expertPending || 0}</h3>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                                <PersonIcon className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="mt-6">
                            <Link href="/admin/users?role=expert_pending" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center">
                                Review Requests <span className="ml-1">→</span>
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Sponsor Requests</p>
                                <h3 className="text-3xl font-black text-gray-900 mt-1">{sponsorPending || 0}</h3>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                                <BackpackIcon className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                        <div className="mt-6">
                            <Link href="/admin/users?role=sponsor_pending" className="text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center">
                                Review Requests <span className="ml-1">→</span>
                            </Link>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 rounded-2xl shadow-lg flex flex-col justify-between text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-sm font-medium text-zinc-400">System Status</p>
                            <h3 className="text-xl font-bold mt-2">All Systems Operational</h3>
                            <p className="text-xs text-zinc-500 mt-1">Last check: {format(new Date(), 'h:mm a')}</p>
                        </div>
                        <div className="mt-6 relative z-10">
                            <div className="flex items-center text-sm font-bold text-emerald-400">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                                Online
                            </div>
                        </div>
                        {/* Decorative BG */}
                        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
                            <ClockIcon className="w-24 h-24" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
