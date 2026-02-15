'use client'

import { UserResponse } from '@/services/api.types'
import {
    CheckIcon,
    Cross2Icon,
    ChevronDownIcon,
    ChevronUpIcon,
    PersonIcon
} from '@radix-ui/react-icons'
import { useEffect, useState } from 'react'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { format } from 'date-fns'
import { getProfileByUserId } from '@/services/api'
import { adminService } from '@/services/admin.service'

// ... (previous imports)
import { EditUserModal } from './modals/EditUserModal'
import { Pencil1Icon } from '@radix-ui/react-icons'

interface UsersTableProps {
    users: UserResponse[]
    onSuspend: (userId: string) => void
    onActivate: (userId: string) => void
    onVerifyExpert: (userId: string) => void
    onRevokeExpert: (userId: string) => void
    onApprovePending?: (userId: string) => void
    onRejectPending?: (userId: string) => void
    onAssignRole?: (userId: string, roleName: string) => void
    onRemoveRole?: (userId: string, roleName: string) => void
    onUserUpdated?: () => void
}

export function UsersTable({ users, onSuspend, onActivate, onVerifyExpert: _onVerifyExpert, onRevokeExpert: _onRevokeExpert, onApprovePending, onRejectPending, onAssignRole, onRemoveRole, onUserUpdated }: UsersTableProps) {
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
    const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({})
    const [suspendUserId, setSuspendUserId] = useState<string | null>(null)
    const [rejectPendingUserId, setRejectPendingUserId] = useState<string | null>(null)
    const [activateUserId, setActivateUserId] = useState<string | null>(null)
    const [removeRoleTarget, setRemoveRoleTarget] = useState<{ userId: string; role: string } | null>(null)

    const [editingUser, setEditingUser] = useState<UserResponse | null>(null)
    const [showRoleEdit, setShowRoleEdit] = useState<Record<string, boolean>>({})

    const [profiles, setProfiles] = useState<Record<string, import('@/services/api.types').ProfileResponse>>({})
    const [onboardingSettings, setOnboardingSettings] = useState<{ enabled_fields: string[]; required_fields: string[] } | null>(null)

    useEffect(() => {
        ; (async () => {
            try {
                const s = await adminService.getOnboardingSettings()
                setOnboardingSettings(s)
            } catch { }
        })()
    }, [])

    const fetchProfile = async (userId: string) => {
        if (profiles[userId]) return
        try {
            const p = await getProfileByUserId(userId)
            setProfiles(prev => ({ ...prev, [userId]: p }))
        } catch { }
    }

    const toggleExpand = (userId: string) => {
        const next = expandedUserId === userId ? null : userId
        setExpandedUserId(next)
        if (next) fetchProfile(next)
    }

    const computeCompleteness = (p?: import('@/services/api.types').ProfileResponse, user?: UserResponse) => {
        if (!p || !onboardingSettings) return { percent: 0, missing: [] as string[] }
        const map: Record<string, unknown> = {
            full_name: p.full_name,
            bio: p.bio,
            linkedin_url: p.linkedin_url,
            github_url: p.github_url,
            instagram_url: p.instagram_url,
            twitter_url: p.twitter_url,
            website_url: p.website_url,
            role: user?.roles && user.roles.length > 0 ? 'present' : undefined // Check user roles for 'role' requirement
        }
        const enabled = onboardingSettings.enabled_fields || []
        const required = onboardingSettings.required_fields || []

        // Calculate based on enabled fields
        const filledCount = enabled.reduce((acc, key) => acc + (map[key] ? 1 : 0), 0)
        const percent = enabled.length > 0 ? Math.round((filledCount / enabled.length) * 100) : 0

        // Missing required fields
        const missing = required.filter((key) => !map[key])

        return { percent, missing }
    }

    return (
        <div className="w-full overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status & Verification</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                        <片 key={user.id}>
                            <tr
                                onClick={() => toggleExpand(user.id)}
                                className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedUserId === user.id ? 'bg-gray-50' : ''}`}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleExpand(user.id); }}
                                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                    >
                                        {expandedUserId === user.id ? (
                                            <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                                        ) : (
                                            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                        )}
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                            <PersonIcon className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {profiles[user.id]?.full_name ? (
                                                <div className="flex flex-col">
                                                    <span>{profiles[user.id].full_name}</span>
                                                    <span className="text-xs text-gray-500 font-normal">{user.email}</span>
                                                </div>
                                            ) : (
                                                user.email
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {Array.isArray(user.roles)
                                        ? Array.from(new Set(user.roles.map((r) => typeof r === 'string' ? r : r.name))).filter(Boolean).join(', ') || '-'
                                        : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                        {/* Status Pill */}
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-800' :
                                            user.status === 'suspended' ? 'bg-red-100 text-red-800' :
                                                user.status === 'frozen' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {user.status === 'active' && '● '}
                                            {user.status === 'suspended' && '✕ '}
                                            {user.status === 'frozen' && '❄ '}
                                            {user.status === 'inactive' && '○ '}
                                            <span className="capitalize">{user.status}</span>
                                        </span>

                                        {/* Verified Pill */}
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.is_verified ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {user.is_verified ? '✓ Verified' : '○ Unverified'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => setEditingUser(user)}
                                            className="text-gray-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded transition-colors"
                                            title="Edit User"
                                        >
                                            <Pencil1Icon className="w-4 h-4" />
                                        </button>

                                        {user.status === 'active' ? (
                                            <button
                                                onClick={() => setSuspendUserId(user.id)}
                                                className="text-red-600 hover:text-red-900 font-medium ml-2"
                                            >
                                                Suspend
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setActivateUserId(user.id)}
                                                className="text-green-600 hover:text-green-900 font-medium ml-2"
                                            >
                                                Activate
                                            </button>
                                        )}

                                        {/* Pending roles approval controls */}
                                        {Array.isArray(user.roles) && user.roles.map((r) => typeof r === 'string' ? r : r.name).some((n) => typeof n === 'string' && n.endsWith('_pending')) && (
                                            <>
                                                {onApprovePending && (
                                                    <button
                                                        onClick={() => onApprovePending(user.id)}
                                                        className="text-blue-600 hover:text-blue-900 font-medium ml-2"
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                                {onRejectPending && (
                                                    <button
                                                        onClick={() => setRejectPendingUserId(user.id)}
                                                        className="text-orange-600 hover:text-orange-900 font-medium ml-2"
                                                    >
                                                        Reject
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            {expandedUserId === user.id && (
                                <tr className="bg-gray-50">
                                    {/* ... (existing expanded details content) */}
                                    <td colSpan={6} className="px-6 py-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-2">User Details</h4>
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-gray-500">Joined:</span>
                                                        <span className="ml-2 text-gray-700">
                                                            {user.created_at ? format(new Date(user.created_at), 'PPP') : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-2">Roles & Permissions</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {Array.isArray(user.roles) && user.roles.length > 0 ? (
                                                        Array.from(new Set(user.roles.map(r => typeof r === 'string' ? r : r.name))).map((name, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">
                                                                {name}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-500">No roles assigned</span>
                                                    )}
                                                </div>
                                                {onAssignRole && onRemoveRole && (
                                                    <div className="mt-4">
                                                        {!showRoleEdit[user.id] ? (
                                                            <button
                                                                onClick={() => setShowRoleEdit(prev => ({ ...prev, [user.id]: true }))}
                                                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                                            >
                                                                Edit Roles & Permissions
                                                            </button>
                                                        ) : (
                                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                                <select
                                                                    value={selectedRoles[user.id] || ''}
                                                                    onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [user.id]: e.target.value }))}
                                                                    className="text-gray-700 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/20"
                                                                >
                                                                    <option value="">Select role</option>
                                                                    {/* Removed 'admin' to prevent accidental assignment */}
                                                                    <option value="student">student</option>
                                                                    <option value="expert">expert</option>
                                                                    <option value="organizer">organizer</option>
                                                                    <option value="sponsor">sponsor</option>
                                                                    <option value="committee">committee</option>
                                                                    <option value="customer_support">customer_support</option>
                                                                    <option value="content_moderator">content_moderator</option>
                                                                </select>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            const role = selectedRoles[user.id]
                                                                            if (role) onAssignRole(user.id, role)
                                                                        }}
                                                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                                                                    >
                                                                        Assign
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const role = selectedRoles[user.id]
                                                                            if (role) setRemoveRoleTarget({ userId: user.id, role })
                                                                        }}
                                                                        className="px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-all"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                                <button
                                                                    onClick={() => setShowRoleEdit(prev => ({ ...prev, [user.id]: false }))}
                                                                    className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-2">Onboarding Completeness</h4>
                                                {(() => {
                                                    const p = profiles[user.id]
                                                    const { percent, missing } = computeCompleteness(p, user)
                                                    if (percent === 100) return <div className="text-sm text-green-600 font-medium flex items-center gap-2"><CheckIcon /> 100% Completed</div>
                                                    return (
                                                        <div className="space-y-3">
                                                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                                                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                                            </div>
                                                            <div className="text-gray-700 font-medium text-sm">{percent}% complete</div>
                                                            {missing.length > 0 && (
                                                                <div>
                                                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Missing Required</div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {missing.map((m) => (
                                                                            <span key={m} className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs border border-orange-100">{m}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </片>
                    ))}
                </tbody>
            </table>
            <ConfirmationModal
                isOpen={!!suspendUserId}
                onClose={() => setSuspendUserId(null)}
                onConfirm={() => { if (suspendUserId) onSuspend(suspendUserId); setSuspendUserId(null) }}
                title="Suspend User"
                message="Suspend this user?"
                confirmText="Suspend"
                cancelText="Cancel"
                variant="danger"
            />
            <ConfirmationModal
                isOpen={!!activateUserId}
                onClose={() => setActivateUserId(null)}
                onConfirm={() => { if (activateUserId) onActivate(activateUserId); setActivateUserId(null) }}
                title="Activate User"
                message="Reactivate this user and restore access?"
                confirmText="Activate"
                cancelText="Cancel"
                variant="primary"
            />
            <ConfirmationModal
                isOpen={!!rejectPendingUserId}
                onClose={() => setRejectPendingUserId(null)}
                onConfirm={() => { if (rejectPendingUserId && onRejectPending) onRejectPending(rejectPendingUserId); setRejectPendingUserId(null) }}
                title="Reject Pending Roles"
                message="Reject all pending role(s) for this user?"
                confirmText="Reject"
                cancelText="Cancel"
                variant="danger"
            />
            <ConfirmationModal
                isOpen={!!removeRoleTarget}
                onClose={() => setRemoveRoleTarget(null)}
                onConfirm={() => { if (removeRoleTarget && onRemoveRole) onRemoveRole(removeRoleTarget.userId, removeRoleTarget.role); setRemoveRoleTarget(null) }}
                title="Remove Role"
                message={removeRoleTarget ? `Remove role: ${removeRoleTarget.role}?` : ''}
                confirmText="Remove"
                cancelText="Cancel"
                variant="danger"
            />

            {editingUser && (
                <EditUserModal
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    user={editingUser}
                    onSuccess={() => {
                        if (onUserUpdated) onUserUpdated()
                    }}
                />
            )}
        </div>
    )
}


const 片 = ({ children }: { children: React.ReactNode }) => <>{children}</>
