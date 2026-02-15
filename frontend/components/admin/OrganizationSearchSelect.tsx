'use client'

import { useState, useEffect, useRef } from 'react'
import { adminService } from '@/services/admin.service'
import { OrganizationResponse } from '@/services/api.types'
import { MagnifyingGlassIcon, CheckCircledIcon } from '@radix-ui/react-icons'

interface OrganizationSearchSelectProps {
    label?: string
    onSelect: (org: OrganizationResponse) => void
    defaultOrgId?: string
    placeholder?: string
}

export function OrganizationSearchSelect({ label, onSelect, defaultOrgId, placeholder = "Search organization..." }: OrganizationSearchSelectProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<OrganizationResponse[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedOrg, setSelectedOrg] = useState<OrganizationResponse | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([])
            return
        }

        const timer = setTimeout(async () => {
            setIsLoading(true)
            try {
                // Search by name
                const orgs = await adminService.getOrganizations({ name: query })
                setResults(orgs)
                setIsOpen(true)
            } catch (error) {
                console.error("Organization search failed", error)
            } finally {
                setIsLoading(false)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [query])

    const handleSelect = (org: OrganizationResponse) => {
        setSelectedOrg(org)
        setQuery('')
        setIsOpen(false)
        onSelect(org)
    }

    const clearSelection = () => {
        setSelectedOrg(null)
        onSelect(null as any) // Type assertion if parent expects optional
    }

    return (
        <div className="relative" ref={wrapperRef}>
            {label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>}

            {selectedOrg ? (
                <div className="flex items-center justify-between p-2 border border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-200 flex items-center justify-center text-blue-700 font-bold overflow-hidden">
                            {selectedOrg.logo_url ? (
                                <img src={selectedOrg.logo_url} alt="logo" className="w-full h-full object-cover" />
                            ) : (
                                selectedOrg.name[0]?.toUpperCase()
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{selectedOrg.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{selectedOrg.type}</p>
                        </div>
                    </div>
                    <button
                        onClick={clearSelection}
                        type="button"
                        className="text-gray-400 hover:text-red-500 px-2"
                    >
                        Change
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setIsOpen(true)
                        }}
                        onFocus={() => setIsOpen(true)}
                    />
                    {isLoading && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            )}

            {/* Dropdown Results */}
            {isOpen && !selectedOrg && (query.length > 0 || results.length > 0) && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.length === 0 && !isLoading ? (
                        <div className="p-3 text-sm text-gray-500 text-center">No organizations found</div>
                    ) : (
                        results.map((org) => (
                            <button
                                key={org.id}
                                type="button"
                                onClick={() => handleSelect(org)}
                                className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0 border-gray-50"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold overflow-hidden">
                                    {org.logo_url ? (
                                        <img src={org.logo_url} alt="logo" className="w-full h-full object-cover" />
                                    ) : (
                                        org.name[0]?.toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{org.name}</p>
                                    <p className="text-xs text-gray-500 truncate capitalize">{org.type}</p>
                                </div>
                                {org.status === 'approved' && <CheckCircledIcon className="w-4 h-4 text-green-500" />}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
