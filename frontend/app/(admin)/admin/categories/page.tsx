'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { listCategories, deleteCategory } from '@/services/api'
import type { CategoryResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { CreateCategoryModal } from '@/components/admin/modals/CreateCategoryModal'
import { BatchCreateCategoriesModal } from '@/components/admin/modals/BatchCreateCategoriesModal'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { Pagination } from '@/components/ui/Pagination'
import { MagnifyingGlassIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons'

export default function AdminCategoriesPage() {
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isBatchCreateOpen, setIsBatchCreateOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const { data: categories, mutate } = useSWR('categories', listCategories)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(timer)
    }, [search])

    // Filter categories
    const filtered = useMemo(() => {
        const cats = categories || []
        return cats.filter(c =>
            c.name.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
    }, [categories, debouncedSearch])

    // Paginate filtered results
    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize
        return filtered.slice(start, start + pageSize)
    }, [filtered, page, pageSize])

    const totalPages = Math.ceil(filtered.length / pageSize)

    const handleDelete = async () => {
        if (!deleteId) return
        try {
            await deleteCategory(deleteId)
            toast.success('Category deleted')
            setDeleteId(null)
            mutate()
        } catch (e) {
            toast.error('Failed to delete category')
            console.error(e)
        }
    }

    const handleEdit = (category: CategoryResponse) => {
        setEditingCategory(category)
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
                    <p className="text-gray-500 mt-1">Manage tag library used for event discovery</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsBatchCreateOpen(true)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                        ⚡ Batch Create
                    </button>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-4 py-2 bg-yellow-400 text-zinc-900 rounded-lg hover:bg-yellow-300 transition-colors font-bold"
                    >
                        + Create Category
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                </div>
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
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created At
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginated.map((category) => (
                                <tr key={category.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                                        {category.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {category.created_at ? new Date(category.created_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(category)}
                                                className="inline-flex items-center gap-1 px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil1Icon className="w-4 h-4" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(category.id)}
                                                className="inline-flex items-center gap-1 px-3 py-2 text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginated.length === 0 && (
                                <tr>
                                    <td className="px-6 py-12 text-center text-sm text-gray-500" colSpan={3}>
                                        {search ? 'No categories found matching your search' : 'No categories yet. Create one to get started.'}
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
                    totalItems={filtered.length}
                    pageSize={pageSize}
                />
            </div>

            {/* Modals */}
            <CreateCategoryModal
                isOpen={isCreateOpen || !!editingCategory}
                onClose={() => {
                    setIsCreateOpen(false)
                    setEditingCategory(null)
                }}
                onSuccess={() => mutate()}
                editingCategory={editingCategory}
            />

            <BatchCreateCategoriesModal
                isOpen={isBatchCreateOpen}
                onClose={() => setIsBatchCreateOpen(false)}
                onSuccess={() => mutate()}
            />

            <ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="Delete Category"
                message="Are you sure you want to delete this category? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    )
}
