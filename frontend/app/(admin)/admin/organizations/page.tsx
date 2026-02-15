'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { OrganizationsTable } from '@/components/admin/OrganizationsTable'
import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons'
import { Pagination } from '@/components/ui/Pagination'
import toast from 'react-hot-toast'
import { toastError } from '@/lib/utils'
import { OrganizationType } from '@/services/api.types'
import { CreateOrganizationModal } from '@/components/admin/modals/CreateOrganizationModal'

const PAGE_SIZE = 10

export default function OrganizationsPage() {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
        return () => clearTimeout(t)
    }, [search])

    const queryParams = {
        page,
        page_size: PAGE_SIZE,
        name: debouncedSearch || undefined,
        type: (typeFilter as OrganizationType) || undefined,
    }

    const { data: organizations, mutate } = useSWR(
        ['/admin/organizations', queryParams],
        () => adminService.getOrganizations(queryParams)
    )

    const { data: totalCount } = useSWR(
        ['/admin/organizations/count', { ...queryParams, page: undefined, page_size: undefined }],
        () => adminService.getOrganizationsCount({
            name: queryParams.name,
            type: queryParams.type
        })
    )

    const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0

    const handleDelete = async (orgId: string, reason?: string) => {
        try {
            const org = organizations?.find(o => o.id === orgId)
            await adminService.deleteOrganization(orgId)
            toast.success('Organization deleted')

            // Notify owner if reason provided
            if (org && org.owner_id) {
                const title = 'Organization Removed'
                const base = `Your organization "${org.name}" has been removed by an administrator.`
                const content = reason ? `${base}\n\nReason: ${reason}` : base

                try {
                    await adminService.broadcastNotification({
                        title,
                        content,
                        target_user_id: org.owner_id
                    })
                } catch (err) {
                    console.error('Failed to notify owner:', err)
                }
            }

            mutate()
        } catch (e) {
            toastError(e, undefined, 'Failed to delete organization')
        }
    }

    const handleApprove = async (orgId: string) => {
        try {
            await adminService.approveOrganization(orgId)
            toast.success('Organization approved')
            mutate()
        } catch (e) {
            toastError(e, undefined, 'Failed to approve organization')
        }
    }

    const handleReject = async (orgId: string) => {
        try {
            await adminService.rejectOrganization(orgId)
            toast.success('Organization rejected')
            mutate()
        } catch (e) {
            toastError(e, undefined, 'Failed to reject organization')
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
                    <p className="text-gray-500 mt-1">Manage all organizations</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            try {
                                toast.loading('Exporting...', { id: 'export-orgs' })
                                const blob = await adminService.exportOrganizations()
                                const url = window.URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `organizations_export.csv`
                                document.body.appendChild(a)
                                a.click()
                                window.URL.revokeObjectURL(url)
                                toast.success('Exported successfully', { id: 'export-orgs' })
                            } catch (e) {
                                console.error(e)
                                toast.error('Failed to export', { id: 'export-orgs' })
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
                        Create Organization
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                    <option value="">All Types</option>
                    <option value="company">Company</option>
                    <option value="university">University</option>
                    <option value="community">Community</option>
                    <option value="nonprofit">Nonprofit</option>
                    <option value="government">Government</option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <OrganizationsTable
                    organizations={organizations || []}
                    onDelete={handleDelete}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onUpdate={() => mutate()}
                />
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={totalCount}
                    pageSize={PAGE_SIZE}
                />
            </div>

            <CreateOrganizationModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={mutate}
            />
        </div>
    )
}
