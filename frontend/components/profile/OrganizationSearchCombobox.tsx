'use client'

import { useState, useEffect } from 'react'
import { getPublicOrganizations, createOrganization } from '@/services/api'
import { OrganizationResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'

interface OrganizationSearchComboboxProps {
    onSelect: (org: OrganizationResponse) => void
    defaultOrgId?: string
    placeholder?: string
    value?: string
    onChange?: (val: string) => void // For manual text input if no org selected, or while searching
}

export function OrganizationSearchCombobox({ 
    onSelect, 
    placeholder = "Search organization...",
    value = '',
    onChange
}: OrganizationSearchComboboxProps) {
    const [query, setQuery] = useState(value)
    const [results, setResults] = useState<OrganizationResponse[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedOrg, setSelectedOrg] = useState<OrganizationResponse | null>(null)
    
    // Create Mode
    const [showCreate, setShowCreate] = useState(false)
    const [newOrgName, setNewOrgName] = useState('')
    const [newOrgType, setNewOrgType] = useState<'company' | 'university' | 'community' | 'nonprofit' | 'government'>('company')
    const [isCreating, setIsCreating] = useState(false)

    // Sync internal query with external value if provided
    useEffect(() => {
        if (value !== undefined && value !== query) {
            setQuery(value)
        }
    }, [value])

    // Debounced search
    useEffect(() => {
        const q = query.trim()
        if (!q || selectedOrg) {
            setResults([])
            return
        }

        const timer = setTimeout(async () => {
            setIsLoading(true)
            try {
                const orgs = await getPublicOrganizations({ q, page: 1, page_size: 5 })
                setResults(orgs)
                setIsOpen(true)
            } catch (error) {
                console.error("Organization search failed", error)
                setResults([])
            } finally {
                setIsLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query, selectedOrg])

    const handleSelect = (org: OrganizationResponse) => {
        setSelectedOrg(org)
        setQuery(org.name)
        setIsOpen(false)
        onSelect(org)
        if (onChange) onChange(org.name)
    }

    const handleCreate = async () => {
        if (!newOrgName.trim()) return
        setIsCreating(true)
        try {
            const org = await createOrganization({ 
                name: newOrgName.trim(), 
                type: newOrgType, 
                visibility: 'public' 
            })
            handleSelect(org)
            setShowCreate(false)
            toast.success('Organization created!')
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Failed to create organization')
        } finally {
            setIsCreating(false)
        }
    }

    const clearSelection = () => {
        setSelectedOrg(null)
        setQuery('')
        if (onChange) onChange('')
        setResults([])
    }

    if (showCreate) {
        return (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-zinc-900">Create New Organization</span>
                    <button 
                        onClick={() => setShowCreate(false)}
                        className="text-xs text-zinc-500 hover:text-zinc-900"
                    >
                        Cancel
                    </button>
                </div>
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="Organization Name"
                        className="text-gray-700 w-full px-4 py-2 rounded-lg border border-zinc-200 bg-white focus:ring-2 focus:ring-yellow-400 outline-none"
                        value={newOrgName}
                        onChange={e => setNewOrgName(e.target.value)}
                    />
                    <select
                        className="text-gray-700 w-full px-4 py-2 rounded-lg border border-zinc-200 bg-white focus:ring-2 focus:ring-yellow-400 outline-none"
                        value={newOrgType}
                        onChange={e => setNewOrgType(e.target.value as any)}
                    >
                        <option value="company">Company</option>
                        <option value="university">University</option>
                        <option value="community">Community</option>
                        <option value="nonprofit">Nonprofit</option>
                        <option value="government">Government</option>
                    </select>
                    <button
                        type="button"
                        disabled={isCreating || !newOrgName.trim()}
                        onClick={handleCreate}
                        className="w-full py-2 rounded-lg bg-zinc-900 text-yellow-400 text-sm font-bold disabled:opacity-50 hover:bg-zinc-800 transition-all"
                    >
                        {isCreating ? 'Creating...' : 'Create & Select'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="relative">
            <div className="relative">
                <input
                    type="text"
                    className={`block w-full px-4 py-3 pl-10 rounded-xl border-zinc-200 bg-zinc-50 text-black focus:bg-white focus:ring-2 focus:ring-yellow-400/50 outline-none ${selectedOrg ? 'font-bold text-zinc-900 bg-yellow-50 border-yellow-200' : ''}`}
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        if (selectedOrg) setSelectedOrg(null)
                        if (onChange) onChange(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    // Don't close immediately on blur to allow clicking options
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className={`h-5 w-5 ${selectedOrg ? 'text-yellow-600' : 'text-zinc-400'}`} />
                </div>
                
                {selectedOrg && (
                    <button
                        onClick={clearSelection}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600"
                    >
                        <span className="text-xs font-bold">✕</span>
                    </button>
                )}

                {isLoading && !selectedOrg && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && !selectedOrg && query.trim().length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                    {results.length > 0 ? (
                        <>
                            {results.map((org) => (
                                <button
                                    key={org.id}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault() // Prevent blur
                                        handleSelect(org)
                                    }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-yellow-50 transition-colors text-left border-b border-gray-50 last:border-0"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex-shrink-0 flex items-center justify-center text-zinc-500 font-bold overflow-hidden border border-amber-100">
                                        {org.logo_url ? (
                                            <img src={org.logo_url} alt="logo" className="w-full h-full object-cover" />
                                        ) : (
                                            org.name[0]?.toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-zinc-900 truncate">{org.name}</p>
                                        <p className="text-xs text-zinc-500 truncate capitalize">{org.type}</p>
                                    </div>
                                </button>
                            ))}
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    setNewOrgName(query)
                                    setShowCreate(true)
                                }}
                                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-zinc-600 border-t border-gray-100 flex items-center gap-2"
                            >
                                <span className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 text-sm">+</span>
                                Not found? Create "{query}"
                            </button>
                        </>
                    ) : (
                        !isLoading && (
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    setNewOrgName(query)
                                    setShowCreate(true)
                                }}
                                className="w-full text-left p-4 hover:bg-gray-50 transition-colors group"
                            >
                                <div className="text-sm text-zinc-500 mb-1">No organization found matching "{query}"</div>
                                <div className="text-yellow-600 font-bold flex items-center gap-2 group-hover:underline text-sm">
                                    Create "{query}" as a new organization
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </div>
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    )
}
