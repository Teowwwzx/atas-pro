'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { UsersTable } from '@/components/admin/UsersTable'
import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons'
import { Pagination } from '@/components/ui/Pagination'
import toast from 'react-hot-toast'
import { toastError } from '@/lib/utils'
import { CreateUserModal } from '@/components/admin/modals/CreateUserModal'

const DEFAULT_PAGE_SIZE = 10

export default function UsersPage() {
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [verifiedFilter, setVerifiedFilter] = useState('')
    const [bulkLoading, setBulkLoading] = useState(false)
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
        return () => clearTimeout(t)
    }, [search])

    const queryParams = {
        page,
        page_size: pageSize,
        email: debouncedSearch || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        is_verified: verifiedFilter === '' ? undefined : verifiedFilter === 'true'
    }

    const { data: users, mutate } = useSWR(
        ['/users', queryParams],
        () => adminService.getUsers(queryParams)
    )

    const { data: totalCount } = useSWR(
        ['/users/count', { ...queryParams, page: undefined }],
        () => adminService.getUsersCount({
            email: queryParams.email,
            role: queryParams.role,
            status: queryParams.status,
            is_verified: queryParams.is_verified
        })
    )

    const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0

    const handleSuspend = async (userId: string) => {
        try {
            await adminService.suspendUser(userId)
            toast.success('User suspended')
            mutate()
        } catch (e) {
            toastError(e, undefined, 'Failed to suspend user')
        }
    }

    const handleActivate = async (userId: string) => {
        try {
            await adminService.activateUser(userId)
            toast.success('User activated')
            mutate()
        } catch (e) {
            toastError(e, undefined, 'Failed to activate user')
        }
    }

    const handleVerifyExpert = async (userId: string) => {
        try {
            await adminService.verifyExpert(userId)
            toast.success('Expert verified')
            mutate()
        } catch (e) {
            toastError(e, undefined, 'Failed to verify expert')
        }
    }

    const handleRevokeExpert = async (userId: string) => {
        try {
            await adminService.revokeExpert(userId)
            toast.success('Expert revoked')
            mutate()
        } catch (e) {
            toastError(e, undefined, 'Failed to revoke expert')
        }
    }

    const handleApprovePending = async (userId: string) => {
        try {
            await adminService.approvePendingRoles(userId)
            toast.success('Pending role(s) approved')
            mutate()
        } catch (e) {
            toastError(e, undefined, 'Failed to approve pending role(s)')
        }
    }

    const handleRejectPending = async (userId: string) => {
        try {
            await adminService.rejectPendingRoles(userId)
            toast.success('Pending role(s) rejected')
            mutate()
        } catch (e) {
            toastError(e, undefined, 'Failed to reject pending role(s)')
        }
    }

    const handleAssignRole = async (userId: string, roleName: string) => {
        try {
            await adminService.assignRole(userId, roleName)
            toast.success(`Assigned role: ${roleName}`)
            mutate()
        } catch (e) {
            toastError(e, undefined, 'Failed to assign role')
        }
    }

    const handleRemoveRole = async (userId: string, roleName: string) => {
        try {
            await adminService.removeRole(userId, roleName)
            toast.success(`Removed role: ${roleName}`)
            mutate()
        } catch (e) {
            toastError(e, undefined, 'Failed to remove role')
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Users</h1>
                    <p className="text-gray-500 mt-1">Manage all registered users</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            try {
                                toast.loading('Exporting...', { id: 'export-users' })
                                const blob = await adminService.exportUsers()
                                const url = window.URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `users_export.csv`
                                document.body.appendChild(a)
                                a.click()
                                window.URL.revokeObjectURL(url)
                                toast.success('Exported successfully', { id: 'export-users' })
                            } catch (e) {
                                console.error(e)
                                toast.error('Failed to export', { id: 'export-users' })
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export CSV
                    </button>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Create User
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by email..."
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
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="organizer">Organizer</option>
                    <option value="expert">Expert</option>
                    <option value="expert_pending">Expert (Pending)</option>
                    <option value="admin">Admin</option>
                    <option value="customer_support">Customer Support</option>
                    <option value="content_moderator">Content Moderator</option>
                </select>
                {roleFilter === 'expert_pending' && (
                    <button
                        onClick={async () => {
                            if (!users || users.length === 0) return
                            setBulkLoading(true)
                            try {
                                await Promise.all(
                                    users.map((u: any) => adminService.approvePendingRoles(u.id))
                                )
                                toast.success('Approved all expert_pending on this page')
                                mutate()
                            } catch (e) {
                                toastError(e, undefined, 'Bulk approve failed')
                            } finally {
                                setBulkLoading(false)
                            }
                        }}
                        disabled={bulkLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 disabled:opacity-50"
                    >
                        {bulkLoading ? 'Approving...' : 'Approve All (Page)'}
                    </button>
                )}
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                </select>
                <select
                    value={verifiedFilter}
                    onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value="">All Verification</option>
                    <option value="true">Verified</option>
                    <option value="false">Unverified</option>
                </select>
                <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <UsersTable
                    users={users || []}
                    onSuspend={handleSuspend}
                    onActivate={handleActivate}
                    onVerifyExpert={handleVerifyExpert}
                    onRevokeExpert={handleRevokeExpert}
                    onApprovePending={handleApprovePending}
                    onRejectPending={handleRejectPending}
                    onAssignRole={handleAssignRole}
                    onRemoveRole={handleRemoveRole}
                    onUserUpdated={() => mutate()}
                />
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={totalCount}
                    pageSize={pageSize}
                />
            </div>

            <CreateUserModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={mutate}
            />
        </div>
    )
}
