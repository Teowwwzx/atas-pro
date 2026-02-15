'use client'

import { useState, useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { OrganizationResponse, OrganizationType, OrganizationVisibility } from '@/services/api.types'
import { adminService } from '@/services/admin.service'
import { toast } from 'react-hot-toast'
import PlacesAutocomplete, { geocodeByAddress } from 'react-places-autocomplete'
import { useLoadScript } from '@react-google-maps/api'

const libraries: ("places")[] = ["places"]

interface EditOrganizationModalProps {
    isOpen: boolean
    onClose: () => void
    organization: OrganizationResponse
    onSuccess: () => void
}

export function EditOrganizationModal({ isOpen, onClose, organization, onSuccess }: EditOrganizationModalProps) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    })
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        website_url: '',
        location: '',
        type: 'community' as OrganizationType,
        visibility: 'public' as OrganizationVisibility,
        logo_url: '',
        cover_url: '',
        owner_id: ''
    })

    // Owner Search State
    const [ownerSearch, setOwnerSearch] = useState('')
    const [ownerOptions, setOwnerOptions] = useState<any[]>([])
    const [selectedNewOwner, setSelectedNewOwner] = useState<{ full_name?: string, email: string } | null>(null)

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (ownerSearch.length >= 2) {
                try {
                    const res = await adminService.getUsers({ name: ownerSearch, page_size: 5 })
                    setOwnerOptions(res)
                } catch (e) { console.error(e) }
            } else {
                setOwnerOptions([])
            }
        }, 400)
        return () => clearTimeout(timer)
    }, [ownerSearch])

    useEffect(() => {
        if (isOpen && organization) {
            setFormData({
                name: organization.name || '',
                description: organization.description || '',
                website_url: organization.website_url || '',
                location: organization.location || '',
                type: organization.type || 'community',
                visibility: organization.visibility || 'public',
                logo_url: organization.logo_url || '',
                cover_url: organization.cover_url || '',
                owner_id: organization.owner_id || ''
            })
        }
    }, [isOpen, organization])

    const [files, setFiles] = useState<{ logo: File | null; cover: File | null }>({ logo: null, cover: null })

    // Refs to clear file inputs
    const logoInputRef = import('react').then(React => React.useRef<HTMLInputElement>(null)).catch(() => ({ current: null })) as any // Hacking inline import is bad, let's fix imports first
    // Actually I need to add useRef to imports. Can I do that in a separate chunk?
    // Let's assume I will add useRef import in another chunk. Or I can do it right here if I replace the whole block or file imports.
    // The previous view showed imports at line 3: `import { useState, useEffect } from 'react'`
    // I need to add `useRef`.

    // I will replace the imports first in a separate call then come back here? No, let's do imports first or try to use proper multiple replacement.

    const logoRef = useRef<HTMLInputElement>(null)
    const coverRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [type]: e.target.files![0] }))
        }
    }

    const handleClearFile = (type: 'logo' | 'cover') => {
        setFiles(prev => ({ ...prev, [type]: null }))
        if (type === 'logo' && logoRef.current) logoRef.current.value = ''
        if (type === 'cover' && coverRef.current) coverRef.current.value = ''
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            await adminService.updateOrganization(organization.id, formData)

            // Parallel uploads
            const uploadPromises = []
            if (files.logo) {
                uploadPromises.push(adminService.updateOrganizationLogo(organization.id, files.logo)
                    .catch((e: any) => { console.error('Logo upload failed', e); toast.error('Logo upload failed'); }))
            }
            if (files.cover) {
                uploadPromises.push(adminService.updateOrganizationCover(organization.id, files.cover)
                    .catch((e: any) => { console.error('Cover upload failed', e); toast.error('Cover upload failed'); }))
            }

            await Promise.all(uploadPromises)

            toast.success('Organization updated successfully')
            onSuccess()
            onClose()
        } catch (error) {
            toast.error('Failed to update organization')
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
                        <Dialog.Title className="text-xl font-bold text-gray-900">Edit Organization</Dialog.Title>
                        <Dialog.Close className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-500" />
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                            <input
                                type="url"
                                value={formData.website_url}
                                onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="https://example.com"
                            />
                        </div>

                        <div className="relative z-20">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            {isLoaded ? (
                                <PlacesAutocomplete
                                    value={formData.location || ''}
                                    onChange={(address) => setFormData(prev => ({ ...prev, location: address }))}
                                    onSelect={async (address) => {
                                        setFormData(prev => ({ ...prev, location: address }))
                                        try {
                                            await geocodeByAddress(address)
                                            // Ideally we save place_id too but backend only supports string location for now
                                        } catch (error) {
                                            console.error('Error selecting place', error)
                                        }
                                    }}
                                >
                                    {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                                        <div className="relative">
                                            <input
                                                {...getInputProps({
                                                    placeholder: 'Search for a location...',
                                                    className: "w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                })}
                                            />
                                            {suggestions.length > 0 && (
                                                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
                                                    {loading && <div className="p-2 text-xs text-gray-500">Loading...</div>}
                                                    {suggestions.map((suggestion) => {
                                                        const className = suggestion.active
                                                            ? 'px-3 py-2 bg-gray-50 cursor-pointer'
                                                            : 'px-3 py-2 bg-white cursor-pointer hover:bg-gray-50';

                                                        const { key, ...optionProps } = getSuggestionItemProps(suggestion, { className });

                                                        return (
                                                            <div key={suggestion.placeId} {...optionProps}>
                                                                <div className="font-medium text-gray-900 text-sm">{suggestion.formattedSuggestion.mainText}</div>
                                                                <div className="text-xs text-gray-500">{suggestion.formattedSuggestion.secondaryText}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </PlacesAutocomplete>
                            ) : (
                                <input
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    disabled
                                />
                            )}
                        </div>

                        <div className="relative z-10">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Owner (Transfer)</label>

                            {/* Current Owner Display */}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                    {(selectedNewOwner?.full_name || organization.owner?.full_name || organization.owner?.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-sm font-bold text-gray-900 truncate">
                                        {selectedNewOwner ? (selectedNewOwner.full_name || 'Selected User') : (organization.owner?.full_name || organization.owner?.email || 'No Name Set')}
                                        {selectedNewOwner && <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">New</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                        {selectedNewOwner?.email || organization.owner?.email || organization.owner_id}
                                    </div>
                                </div>
                            </div>

                            {/* Search Input */}
                            <input
                                value={ownerSearch}
                                onChange={e => setOwnerSearch(e.target.value)}
                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                placeholder="Search & Transfer Ownership..."
                            />

                            {/* Search Results */}
                            {ownerOptions.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden max-h-48 overflow-y-auto">
                                    {ownerOptions.map(u => (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, owner_id: u.id })
                                                setSelectedNewOwner(u)
                                                setOwnerSearch('')
                                                setOwnerOptions([])
                                            }}
                                            className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                {u.full_name?.charAt(0) || u.email.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">{u.full_name || 'No Name'}</div>
                                                <div className="text-xs text-gray-500 truncate">{u.email}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Update Logo</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={logoRef}
                                        onChange={e => handleFileChange(e, 'logo')}
                                        className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {files.logo && (
                                        <button
                                            type="button"
                                            onClick={() => handleClearFile('logo')}
                                            className="text-red-500 hover:text-red-700"
                                            title="Remove file"
                                        >
                                            <Cross2Icon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Update Cover</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={coverRef}
                                        onChange={e => handleFileChange(e, 'cover')}
                                        className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {files.cover && (
                                        <button
                                            type="button"
                                            onClick={() => handleClearFile('cover')}
                                            className="text-red-500 hover:text-red-700"
                                            title="Remove file"
                                        >
                                            <Cross2Icon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as OrganizationType })}
                                    className="text-gray-700 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="company">Company</option>
                                    <option value="university">University</option>
                                    <option value="community">Community</option>
                                    <option value="nonprofit">Nonprofit</option>
                                    <option value="government">Government</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                                <select
                                    value={formData.visibility}
                                    onChange={e => setFormData({ ...formData, visibility: e.target.value as OrganizationVisibility })}
                                    className="text-gray-700 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                </select>
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
