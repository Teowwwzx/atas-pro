'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { Pencil2Icon, TrashIcon, PlusIcon } from '@radix-ui/react-icons'
import toast from 'react-hot-toast'
import { toastError } from '@/lib/utils'

export default function SkillsPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingSkill, setEditingSkill] = useState<{ id: string; name: string } | null>(null)
    const [skillName, setSkillName] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { data: skills, mutate } = useSWR('/admin/skills', () => adminService.getSkills())

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!skillName.trim()) {
            toast.error('Skill name is required')
            return
        }
        setIsSubmitting(true)
        try {
            await adminService.createSkill({ name: skillName.trim() })
            toast.success('Skill created successfully')
            setSkillName('')
            setIsCreateOpen(false)
            mutate()
        } catch (error) {
            toastError(error, 'Failed to create skill')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingSkill || !skillName.trim()) return
        setIsSubmitting(true)
        try {
            await adminService.updateSkill(editingSkill.id, { name: skillName.trim() })
            toast.success('Skill updated successfully')
            setSkillName('')
            setEditingSkill(null)
            mutate()
        } catch (error) {
            toastError(error, 'Failed to update skill')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return
        try {
            await adminService.deleteSkill(id)
            toast.success('Skill deleted successfully')
            mutate()
        } catch (error) {
            toastError(error, 'Failed to delete skill')
        }
    }

    const startEdit = (skill: { id: string; name: string }) => {
        setEditingSkill(skill)
        setSkillName(skill.name)
    }

    const cancelEdit = () => {
        setEditingSkill(null)
        setSkillName('')
    }

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Skills Management</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage skill tags for expert profiles</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Skill
                </button>
            </div>

            {/* Create/Edit Form */}
            {(isCreateOpen || editingSkill) && (
                <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {editingSkill ? 'Edit Skill' : 'Create New Skill'}
                    </h3>
                    <form onSubmit={editingSkill ? handleUpdate : handleCreate} className="flex gap-3">
                        <input
                            type="text"
                            value={skillName}
                            onChange={(e) => setSkillName(e.target.value)}
                            placeholder="Enter skill name..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            autoFocus
                            required
                        />
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : (editingSkill ? 'Update' : 'Create')}
                        </button>
                        <button
                            type="button"
                            onClick={editingSkill ? cancelEdit : () => { setIsCreateOpen(false); setSkillName('') }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            )}

            {/* Skills Table */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Skill Name
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {!skills && (
                            <tr>
                                <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        )}
                        {skills && skills.length === 0 && (
                            <tr>
                                <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                                    No skills found. Create one to get started.
                                </td>
                            </tr>
                        )}
                        {skills && skills.map((skill) => (
                            <tr key={skill.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {skill.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => startEdit(skill)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4 inline-flex items-center"
                                    >
                                        <Pencil2Icon className="w-4 h-4 mr-1" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(skill.id, skill.name)}
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

            {skills && skills.length > 0 && (
                <div className="mt-4 text-sm text-gray-500">
                    Total: {skills.length} skill{skills.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    )
}
