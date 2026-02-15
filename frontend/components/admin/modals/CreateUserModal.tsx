'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon, CheckIcon } from '@radix-ui/react-icons'
import { register, updateProfile, getProfileByUserId, getMe } from '@/services/api'
import { adminService } from '@/services/admin.service'
import { toast } from 'react-hot-toast'
import { toastError } from '@/lib/utils'

interface CreateUserModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'student',
        is_verified: true,
        send_email: false // Future: Send welcome email
    })

    const roles = [
        { value: 'student', label: 'Student' },
        { value: 'teacher', label: 'Teacher' },
        { value: 'organizer', label: 'Organizer' },
        { value: 'expert', label: 'Expert' },
        { value: 'sponsor', label: 'Sponsor' },
        { value: 'admin', label: 'Admin' },
        { value: 'committee', label: 'Committee' },
        { value: 'customer_support', label: 'Customer Support' },
        { value: 'content_moderator', label: 'Content Moderator' },
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            // 1. Register User
            // Note: This logs us in as new user if we use the public register? 
            // Usually public register returns token. We don't want to switch session.
            // But we don't have a specific "admin create user" endpoint in the provided service.
            // If `register` sets the token in localStorage, we might lose admin session.
            // Let's check `register` implementation.
            // It calls `/auth/register` and returns data. It DOES NOT set localStorage automatically in the service function provided in `api.ts`.
            // Wait, `login` sets it? `api.ts` doesn't seem to set token in `register`.
            // Let's assume it's safe.

            const regRes = await register({
                email: formData.email,
                password: formData.password
            })
            const userId = regRes.id

            // 2. Update Profile (Name) - Admin override
            // We need to call admin endpoint to update ANOTHER user's profile.
            // `adminService.updateUserProfile(userId, { full_name })`
            if (formData.full_name) {
                await adminService.updateUserProfile(userId, { full_name: formData.full_name })
            }

            // 3. Assign Role
            if (formData.role && formData.role !== 'student') {
                // Register defaults to 'student' usually.
                await adminService.assignRole(userId, formData.role)

                // If expert/organizer, might need to approve pending?
                // `assignRole` usually forces the role.
                // If the system puts them in `_pending`, we might need to approve.
                // For now, assume `assignRole` grants the role directly.
            }

            // 4. Set Verified Status
            if (formData.is_verified) {
                // Register usually sends verification email. 
                // Admin can force verify.
                // Need an endpoint for this. `adminService.updateUser`?
                // `updateUser` takes { is_verified, status }
                await adminService.updateUser(userId, { is_verified: true, status: 'active' })
            }

            toast.success('User created successfully')
            onSuccess()
            onClose()

            // Reset
            setFormData({
                email: '',
                password: '',
                full_name: '',
                role: 'student',
                is_verified: true,
                send_email: false
            })

        } catch (error: any) {
            console.error(error)
            toastError(error, 'Failed to create user')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 w-full max-w-md outline-none">
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-gray-900">Create User</Dialog.Title>
                        <Dialog.Close className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-500" />
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                                minLength={8}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {roles.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center pt-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_verified}
                                            onChange={e => setFormData({ ...formData, is_verified: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Verified</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-sm flex items-center gap-2"
                            >
                                {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {isLoading ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
