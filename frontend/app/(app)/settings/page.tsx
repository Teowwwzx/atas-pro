'use client'

import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'privacy' | 'danger'>('account')

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [changingPassword, setChangingPassword] = useState(false)

    // Delete account state
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [userEmail, setUserEmail] = useState('')

    // Privacy state
    const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public')
    const [savingPrivacy, setSavingPrivacy] = useState(false)

    React.useEffect(() => {
        const loadData = async () => {
            try {
                const { getMe, getMyProfile } = await import('@/services/api')
                const [me, profile] = await Promise.all([
                    getMe(),
                    getMyProfile()
                ])
                setUserEmail(me.email)
                setProfileVisibility(profile.visibility)
            } catch (error) {
                console.error('Failed to load settings data', error)
            }
        }
        loadData()
    }, [])

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match')
            return
        }

        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }

        setChangingPassword(true)
        try {
            const { changePassword } = await import('@/services/api')
            await changePassword(currentPassword, newPassword)

            toast.success('Password changed successfully')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Failed to change password')
        } finally {
            setChangingPassword(false)
        }
    }

    const handlePrivacySave = async () => {
        setSavingPrivacy(true)
        try {
            const { updateProfile } = await import('@/services/api')
            await updateProfile({ visibility: profileVisibility })
            toast.success('Privacy settings saved')
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Failed to save privacy settings')
        } finally {
            setSavingPrivacy(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== userEmail) {
            toast.error(`Please type ${userEmail} to confirm`)
            return
        }

        setDeleting(true)
        try {
            const { deleteMyAccount } = await import('@/services/api')
            await deleteMyAccount()

            toast.success('Account deleted successfully')
            localStorage.removeItem('atas_token')
            router.push('/')
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Failed to delete account')
        } finally {
            setDeleting(false)
        }
    }

    const tabs = [
        { id: 'account', label: 'Account', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        { id: 'notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
        { id: 'privacy', label: 'Privacy', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
        { id: 'danger', label: 'Danger Zone', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    ]

    return (
        <div className="min-h-screen bg-amber-50 py-12">
            <div className="max-w-5xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-zinc-900 mb-2">Settings</h1>
                    <p className="text-zinc-600 font-medium">Manage your account settings and preferences</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <aside className="lg:col-span-1">
                        <nav className="space-y-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === tab.id
                                        ? 'bg-yellow-400 text-zinc-900 shadow-lg shadow-yellow-400/20'
                                        : 'text-zinc-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
                                    </svg>
                                    <span className="font-bold">{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="lg:col-span-3 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                        {activeTab === 'account' && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-2xl font-black text-zinc-900 mb-6">Change Password</h2>
                                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-900 mb-2">Current Password</label>
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                required
                                                className="text-gray-700 w-full rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-yellow-400 py-3 px-4 font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-900 mb-2">New Password</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                className="text-gray-700 w-full rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-yellow-400 py-3 px-4 font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-zinc-900 mb-2">Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                className="text-gray-700 w-full rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-yellow-400 py-3 px-4 font-medium"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={changingPassword}
                                            className="px-6 py-3 bg-zinc-900 text-yellow-400 rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50"
                                        >
                                            {changingPassword ? 'Changing...' : 'Change Password'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div>
                                <h2 className="text-2xl font-black text-zinc-900 mb-6">Notification Preferences</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <div className="font-bold text-zinc-900">Email Notifications</div>
                                            <div className="text-sm text-zinc-500">Receive email updates about events and activities</div>
                                        </div>
                                        <input type="checkbox" className="w-5 h-5 rounded text-yellow-400 focus:ring-yellow-400" defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <div className="font-bold text-zinc-900">Event Reminders</div>
                                            <div className="text-sm text-zinc-500">Get reminded before events you're attending</div>
                                        </div>
                                        <input type="checkbox" className="w-5 h-5 rounded text-yellow-400 focus:ring-yellow-400" defaultChecked />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div>
                                <h2 className="text-2xl font-black text-zinc-900 mb-6">Privacy Settings</h2>
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <label className="block text-sm font-bold text-zinc-900 mb-2">Profile Visibility</label>
                                        <div className="flex items-center gap-4">
                                            <select
                                                value={profileVisibility}
                                                onChange={(e) => setProfileVisibility(e.target.value as 'public' | 'private')}
                                                className="text-gray-700 w-full max-w-xs rounded-xl bg-white border-0 focus:ring-2 focus:ring-yellow-400 py-3 px-4 font-medium"
                                            >
                                                <option value="public">Public</option>
                                                <option value="private">Private</option>
                                            </select>
                                            <button
                                                onClick={handlePrivacySave}
                                                disabled={savingPrivacy}
                                                className="px-6 py-3 bg-zinc-900 text-yellow-400 rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                                            >
                                                {savingPrivacy ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'danger' && (
                            <div>
                                <h2 className="text-2xl font-black text-zinc-900 mb-4 text-red-600">Danger Zone</h2>
                                <div className="p-6 bg-red-50 rounded-xl border border-red-200">
                                    <h3 className="font-bold text-zinc-900 mb-2">Delete Account</h3>
                                    <p className="text-sm text-zinc-600 mb-4">
                                        Once you delete your account, there is no going back. Your data will be marked for deletion and your account will be deactivated.
                                    </p>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
                                    >
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 mb-2">Delete Account</h3>
                        <p className="text-zinc-600 font-medium mb-6">
                            This action cannot be undone. Please type <span className="font-bold text-red-600">{userEmail}</span> to confirm.
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder={`Type ${userEmail}`}
                            className="text-gray-700 w-full rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-red-400 py-3 px-4 font-bold mb-6"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false)
                                    setDeleteConfirmText('')
                                }}
                                className="flex-1 py-3 bg-gray-100 text-zinc-700 font-bold rounded-xl hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleting || deleteConfirmText !== userEmail}
                                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
