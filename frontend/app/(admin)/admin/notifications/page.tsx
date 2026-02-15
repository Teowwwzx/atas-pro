

'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { SendNotificationModal } from '@/components/admin/modals/SendNotificationModal'
import { Pagination } from '@/components/ui/Pagination'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'

export default function AdminNotificationsPage() {
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [isSendOpen, setIsSendOpen] = useState(false)

    const queryParams = {
        action: 'broadcast_notification',
        page,
        page_size: pageSize,
    }

    const { data: logs, mutate } = useSWR(
        ['/admin/audit-logs', queryParams],
        () => adminService.getAuditLogs(queryParams)
    )

    const { data: totalCount } = useSWR(
        ['/admin/audit-logs/count', { action: 'broadcast_notification' }],
        () => adminService.getAuditLogsCount({ action: 'broadcast_notification' })
    )

    // Parse audit logs to extract notification details
    const notifications = useMemo(() => {
        return (logs || []).map(log => {
            let details: any = {}
            try {
                details = JSON.parse(log.details || '{}')
            } catch { }

            return {
                id: log.id,
                title: details.title || 'Untitled',
                content: details.content || '',
                target_role: details.target_role || 'All',
                recipient_count: details.recipient_count || details.count || 0,
                link_url: details.link_url || '',
                created_at: log.created_at,
                actor_email: log.actor_email || 'System'
            }
        })
    }, [logs])

    // Filter notifications
    const filtered = useMemo(() => {
        let result = notifications

        if (search) {
            result = result.filter(n =>
                n.title.toLowerCase().includes(search.toLowerCase()) ||
                n.content.toLowerCase().includes(search.toLowerCase())
            )
        }

        if (roleFilter) {
            result = result.filter(n =>
                n.target_role.toLowerCase() === roleFilter.toLowerCase() ||
                (roleFilter === 'all' && (n.target_role === 'All' || !n.target_role))
            )
        }

        return result
    }, [notifications, search, roleFilter])

    const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))

        if (hours < 1) return 'Just now'
        if (hours < 24) return `${hours}h ago`
        if (days < 7) return `${days}d ago`
        return date.toLocaleDateString()
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sent Notifications</h1>
                    <p className="text-gray-500 mt-1">View and send in-app notifications to users</p>
                </div>
                <button
                    onClick={() => setIsSendOpen(true)}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                    + Send Notification
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by title or content..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value="">All Roles</option>
                    <option value="all">All Users</option>
                    <option value="student">Students</option>
                    <option value="teacher">Teachers</option>
                    <option value="organizer">Organizers</option>
                    <option value="admin">Admins</option>
                </select>
                <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Title
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Content
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Target Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Recipients
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sent By
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sent At
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filtered.map((notification) => (
                                <tr key={notification.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {notification.title}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="max-w-xs truncate" title={notification.content}>
                                            {notification.content}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="capitalize">{notification.target_role}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {notification.recipient_count}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {notification.actor_email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(notification.created_at)}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td className="px-6 py-12 text-center text-sm text-gray-500" colSpan={6}>
                                        {search || roleFilter ? 'No notifications found matching your filters' : 'No notifications sent yet'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={totalCount || 0}
                    pageSize={pageSize}
                />
            </div>

            {/* Modal */}
            <SendNotificationModal
                isOpen={isSendOpen}
                onClose={() => setIsSendOpen(false)}
                onSuccess={() => {
                    mutate()
                    setIsSendOpen(false)
                }}
            />
        </div>
    )
}
