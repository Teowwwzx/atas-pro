'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { createOrganization } from '@/services/api'
import { toast } from 'react-hot-toast'
import { OrganizationType, OrganizationVisibility } from '@/services/api.types'

interface UserCreateOrganizationModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (orgId: string) => void
}

export function UserCreateOrganizationModal({ isOpen, onClose, onSuccess }: UserCreateOrganizationModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'community' as OrganizationType,
        visibility: 'public' as OrganizationVisibility,
        website_url: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const createdOrg = await createOrganization({
                name: formData.name,
                description: formData.description,
                type: formData.type,
                website_url: formData.website_url,
                visibility: formData.visibility,
            })

            toast.success('Organization created successfully')
            onSuccess(createdOrg.id)
            onClose()
            setFormData({
                name: '',
                description: '',
                type: 'community',
                visibility: 'public',
                website_url: '',
            })
        } catch (error: any) {
            console.error(error)
            toast.error(error?.response?.data?.detail || 'Failed to create organization')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
                    <div className="flex items-center justify-between mb-6">
                        <Dialog.Title className="text-xl font-bold text-zinc-900">
                            Create Organization
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="rounded-full p-2 hover:bg-zinc-100 transition-colors">
                                <Cross2Icon className="h-4 w-4 text-zinc-500" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-zinc-900 mb-1">Name</label>
                            <input
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="text-gray-700 block w-full rounded-xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 px-4 py-3"
                                placeholder="Organization Name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-900 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="text-gray-700 block w-full rounded-xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 px-4 py-3"
                                rows={3}
                                placeholder="What is this organization about?"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-zinc-900 mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as OrganizationType })}
                                    className="text-gray-700 block w-full rounded-xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 px-4 py-3"
                                >
                                    <option value="community">Community</option>
                                    <option value="company">Company</option>
                                    <option value="non_profit">Non-Profit</option>
                                    <option value="education">Education</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-zinc-900 mb-1">Visibility</label>
                                <select
                                    value={formData.visibility}
                                    onChange={e => setFormData({ ...formData, visibility: e.target.value as OrganizationVisibility })}
                                    className="text-gray-700 block w-full rounded-xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 px-4 py-3"
                                >
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                </select>
                            </div>
                        </div>

                         <div>
                            <label className="block text-sm font-bold text-zinc-900 mb-1">Website (Optional)</label>
                            <input
                                type="url"
                                value={formData.website_url}
                                onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                                className="text-gray-700 block w-full rounded-xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 px-4 py-3"
                                placeholder="https://example.com"
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-black bg-yellow-400 hover:bg-yellow-500 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Creating...' : 'Create Organization'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
