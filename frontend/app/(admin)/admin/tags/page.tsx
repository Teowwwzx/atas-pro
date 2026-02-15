'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { Pencil2Icon, TrashIcon, PlusIcon } from '@radix-ui/react-icons'
import toast from 'react-hot-toast'
import { toastError } from '@/lib/utils'

export default function TagsPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null)
    const [tagName, setTagName] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { data: tags, mutate } = useSWR('/admin/tags', () => adminService.getTags())

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tagName.trim()) {
            toast.error('Tag name is required')
            return
        }
        setIsSubmitting(true)
        try {
            await adminService.createTag({ name: tagName.trim() })
            toast.success('Tag created successfully')
            setTagName('')
            setIsCreateOpen(false)
            mutate()
        } catch (error) {
            toastError(error, 'Failed to create tag')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingTag || !tagName.trim()) return
        setIsSubmitting(true)
        try {
            await adminService.updateTag(editingTag.id, { name: tagName.trim() })
            toast.success('Tag updated successfully')
            setTagName('')
            setEditingTag(null)
            mutate()
        } catch (error) {
            toastError(error, 'Failed to update tag')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return
        try {
            await adminService.deleteTag(id)
            toast.success('Tag deleted successfully')
            mutate()
        } catch (error) {
            toastError(error, 'Failed to delete tag')
        }
    }

    const startEdit = (tag: { id: string; name: string }) => {
        setEditingTag(tag)
        setTagName(tag.name)
    }

    const cancelEdit = () => {
        setEditingTag(null)
        setTagName('')
    }

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Tags Management</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage profile tags for categorization and discovery</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Tag
                </button>
            </div>

            {/* Create/Edit Form */}
            {(isCreateOpen || editingTag) && (
                <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {editingTag ? 'Edit Tag' : 'Create New Tag'}
                    </h3>
                    <form onSubmit={editingTag ? handleUpdate : handleCreate} className="flex gap-3">
                        <input
                            type="text"
                            value={tagName}
                            onChange={(e) => setTagName(e.target.value)}
                            placeholder="Enter tag name..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            autoFocus
                            required
                        />
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : (editingTag ? 'Update' : 'Create')}
                        </button>
                        <button
                            type="button"
                            onClick={editingTag ? cancelEdit : () => { setIsCreateOpen(false); setTagName('') }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            )}

            {/* Tags Table */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tag Name
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {!tags && (
                            <tr>
                                <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        )}
                        {tags && tags.length === 0 && (
                            <tr>
                                <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                                    No tags found. Create one to get started.
                                </td>
                            </tr>
                        )}
                        {tags && tags.map((tag) => (
                            <tr key={tag.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {tag.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => startEdit(tag)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4 inline-flex items-center"
                                    >
                                        <Pencil2Icon className="w-4 h-4 mr-1" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(tag.id, tag.name)}
                                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                                    >
                                        <TrashIcon className="w-4 h-4 mr-1" />
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {tags && tags.length > 0 && (
                <div className="mt-4 text-sm text-gray-500">
                    Total: {tags.length} tag{tags.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    )
}
