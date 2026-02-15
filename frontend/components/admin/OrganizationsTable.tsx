'use client'

import { useState } from 'react'
import { OrganizationResponse } from '@/services/api.types'
import {
    TrashIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ImageIcon,
    Cross2Icon,
    CheckIcon,
    GlobeIcon,
    SewingPinFilledIcon
} from '@radix-ui/react-icons'
import * as Dialog from '@radix-ui/react-dialog'
import Image from 'next/image'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'

// ... imports
import { EditOrganizationModal } from './modals/EditOrganizationModal'

import { Pencil1Icon } from '@radix-ui/react-icons'
import { StatusPill } from '@/components/ui/StatusPill'

interface OrganizationsTableProps {
    organizations: OrganizationResponse[]
    onDelete: (orgId: string, reason?: string) => void
    onApprove: (orgId: string) => void
    onReject: (orgId: string) => void
    onUpdate: () => void
}

export function OrganizationsTable({ organizations, onDelete, onApprove, onReject, onUpdate }: OrganizationsTableProps) {
    const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null)
    const [deleteReason, setDeleteReason] = useState<string>('')
    const [editingOrg, setEditingOrg] = useState<OrganizationResponse | null>(null)

    const toggleExpand = (orgId: string) => {
        setExpandedOrgId(expandedOrgId === orgId ? null : orgId)
    }

    return (
        <>
            <div className="w-full overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {organizations.map((org) => (
                            <片 key={org.id}>
                                <tr
                                    onClick={() => toggleExpand(org.id)}
                                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedOrgId === org.id ? 'bg-gray-50' : ''}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleExpand(org.id); }}
                                            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                        >
                                            {expandedOrgId === org.id ? (
                                                <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                                            ) : (
                                                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            {org.logo_url ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setPreviewImage(org.logo_url || null); }}
                                                    className="relative group flex-shrink-0"
                                                >
                                                    <Image
                                                        src={org.logo_url}
                                                        alt=""
                                                        width={40}
                                                        height={40}
                                                        unoptimized
                                                        className="w-10 h-10 rounded-lg object-cover bg-gray-100 group-hover:opacity-80 transition-opacity"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ImageIcon className="w-4 h-4 text-white drop-shadow-md" />
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                    <ImageIcon className="w-4 h-4 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="text-sm font-medium text-gray-900">{org.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${(org.type as string) === 'club' ? 'bg-purple-100 text-purple-700' :
                                            (org.type as string) === 'society' ? 'bg-indigo-100 text-indigo-700' :
                                                org.type === 'community' ? 'bg-teal-100 text-teal-700' :
                                                    org.type === 'company' ? 'bg-cyan-100 text-cyan-700' :
                                                        'bg-gray-100 text-gray-700'
                                            }`}>
                                            {org.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${org.visibility === 'public' ? 'bg-blue-100 text-blue-700' :
                                            org.visibility === 'private' ? 'bg-purple-100 text-purple-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                            {org.visibility}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${(org.status as string) === 'active' ? 'bg-green-100 text-green-800' :
                                            org.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                org.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {(org.status as string) === 'active' && '✓ '}
                                            {org.status === 'pending' && '⏳ '}
                                            {org.status === 'rejected' && '✕ '}
                                            {org.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setEditingOrg(org)}
                                                className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit Organization"
                                            >
                                                <Pencil1Icon className="w-5 h-5" />
                                            </button>

                                            {org.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => onApprove(org.id)}
                                                        className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Approve Organization"
                                                    >
                                                        <CheckIcon className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onReject(org.id)}
                                                        className="text-amber-600 hover:text-amber-900 p-2 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Reject Organization"
                                                    >
                                                        <Cross2Icon className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => setDeleteOrgId(org.id)}
                                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Organization"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {expandedOrgId === org.id && (
                                    <tr className="bg-gray-50">
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                                                    <p className="text-gray-600 whitespace-pre-wrap">{org.description || 'No description provided.'}</p>

                                                    {org.cover_url && (
                                                        <div className="mt-4">
                                                            <h4 className="font-semibold text-gray-900 mb-2">Cover Image</h4>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setPreviewImage(org.cover_url || null); }}
                                                                className="relative group block w-full max-w-xs overflow-hidden rounded-lg border border-gray-200"
                                                            >
                                                                <Image
                                                                    src={org.cover_url}
                                                                    alt="Cover"
                                                                    width={512}
                                                                    height={128}
                                                                    unoptimized
                                                                    className="w-full h-32 object-cover group-hover:opacity-90 transition-opacity"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                                                                    <ImageIcon className="w-6 h-6 text-white drop-shadow-md" />
                                                                </div>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                                            <GlobeIcon className="w-4 h-4" /> Website
                                                        </h4>
                                                        {org.website_url ? (
                                                            <a href={org.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                {org.website_url}
                                                            </a>
                                                        ) : (
                                                            <p className="text-gray-500">Not provided</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                                            <SewingPinFilledIcon className="w-4 h-4" /> Location
                                                        </h4>
                                                        <p className="text-gray-600">{org.location || 'Not provided'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </片>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingOrg && (
                <EditOrganizationModal
                    isOpen={!!editingOrg}
                    onClose={() => setEditingOrg(null)}
                    organization={editingOrg}
                    onSuccess={onUpdate}
                />
            )}

            <Dialog.Root open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-xl shadow-2xl z-50 max-w-3xl max-h-[90vh] w-full outline-none">
                        <Dialog.Title className="sr-only">Image Preview</Dialog.Title>
                        <Dialog.Description className="sr-only">
                            Full size preview of the organization image
                        </Dialog.Description>
                        {previewImage && (
                            <Image
                                src={previewImage}
                                alt="Preview"
                                width={1200}
                                height={800}
                                unoptimized
                                className="w-full h-full object-contain rounded-lg"
                            />
                        )}
                        <Dialog.Close className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-white transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-900" />
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Custom Delete Modal with Reason */}
            <Dialog.Root open={!!deleteOrgId} onOpenChange={() => { setDeleteOrgId(null); setDeleteReason('') }}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 w-full max-w-lg outline-none">
                        <Dialog.Title className="text-lg font-bold text-gray-900 mb-2">Delete Organization</Dialog.Title>
                        <p className="text-sm text-gray-700 mb-4">Are you sure you want to delete this organization? This action cannot be undone. Please provide a reason.</p>
                        <textarea
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg h-28 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                            placeholder="Reason for deletion (optional)..."
                        />
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                onClick={() => { setDeleteOrgId(null); setDeleteReason('') }}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 text-sm transition-colors shadow-sm"
                                onClick={() => { if (deleteOrgId) onDelete(deleteOrgId, deleteReason); setDeleteOrgId(null); setDeleteReason('') }}
                            >
                                Delete
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    )
}

const 片 = ({ children }: { children: React.ReactNode }) => <>{children}</>
