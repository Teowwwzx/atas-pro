'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { UserResponse, ProfileResponse } from '@/services/api.types'
import { adminService } from '@/services/admin.service'
import { getProfileByUserId } from '@/services/api'
import { toast } from 'react-hot-toast'

interface EditUserModalProps {
    isOpen: boolean
    onClose: () => void
    user: UserResponse
    onSuccess: () => void
}

export function EditUserModal({ isOpen, onClose, user, onSuccess }: EditUserModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [profile, setProfile] = useState<ProfileResponse | null>(null)
    const [formData, setFormData] = useState({
        full_name: '',
        bio: '',
        phone_number: '',
        linkedin_url: '',
        avatar_url: '',
        cover_url: '',
    })

    useEffect(() => {
        if (isOpen && user.id) {
            getProfileByUserId(user.id)
                .then(p => {
                    setProfile(p)
                    setFormData({
                        full_name: p.full_name || '',
                        bio: p.bio || '',
                        phone_number: p.phone_number || '',
                        linkedin_url: p.linkedin_url || '',
                        avatar_url: p.avatar_url || '',
                        cover_url: p.cover_url || '', // Note: profile_schema might name it cover_picture_url, checking type...
                    })
                })
                .catch(() => {
                    // Profile might not exist or error
                })
        }
    }, [isOpen, user.id])

    const [files, setFiles] = useState<{ avatar: File | null; cover: File | null }>({ avatar: null, cover: null })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [type]: e.target.files![0] }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            await adminService.updateUserProfile(user.id, formData)

            if (files.avatar) {
                try {
                    await adminService.updateUserAvatar(user.id, files.avatar)
                } catch (e) {
                    console.error('Avatar upload failed', e)
                    toast.error('Avatar upload failed')
                }
            }
            if (files.cover) {
                try {
                    await adminService.updateUserCover(user.id, files.cover)
                } catch (e) {
                    console.error('Cover upload failed', e)
                    toast.error('Cover upload failed')
                }
            }

            toast.success('User updated successfully')
            onSuccess()
            onClose()
        } catch (error) {
            toast.error('Failed to update user')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 w-full max-w-lg outline-none max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-gray-900">Edit User</Dialog.Title>
                        <Dialog.Close className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-500" />
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="text"
                                value={user.email}
                                disabled
                                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-sm cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                            <textarea
                                value={formData.bio}
                                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                className="text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                                placeholder="Brief user bio..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                value={formData.phone_number}
                                onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="+60..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                            <input
                                value={formData.linkedin_url}
                                onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="https://linkedin.com/in/..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Update Avatar</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => handleFileChange(e, 'avatar')}
                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Update Cover</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => handleFileChange(e, 'cover')}
                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
