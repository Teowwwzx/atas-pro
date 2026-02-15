'use client'

import { useState, useEffect, useRef } from 'react'
import { adminService } from '@/services/admin.service'
import { UserResponse } from '@/services/api.types'
import { MagnifyingGlassIcon, CheckCircledIcon } from '@radix-ui/react-icons'

interface UserSearchSelectProps {
    label?: string
    onSelect: (user: UserResponse) => void
    defaultUserId?: string
    placeholder?: string
}

export function UserSearchSelect({ label, onSelect, defaultUserId, placeholder = "Search by name or email..." }: UserSearchSelectProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<UserResponse[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null)
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
                // Search by both email AND name to get comprehensive results
                // Make parallel requests for email and name search
                const searchPromises = []

                // Always search by email (partial match)
                searchPromises.push(
                    adminService.getUsers({ email: query }).catch(() => [])
                )

                // Always search by name (partial match)
                searchPromises.push(
                    adminService.getUsers({ name: query }).catch(() => [])
                )

                const [emailResults, nameResults] = await Promise.all(searchPromises)

                // Merge and deduplicate results
                const allResults = [...emailResults, ...nameResults]
                const uniqueUsers = allResults.filter((user, index, self) =>
                    index === self.findIndex(u => u.id === user.id)
                )

                setResults(uniqueUsers)
                setIsOpen(true)
            } catch (error) {
                console.error("User search failed", error)
            } finally {
                setIsLoading(false)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [query])

    const handleSelect = (user: UserResponse) => {
        setSelectedUser(user)
        setQuery('')
        setIsOpen(false)
        onSelect(user)
    }

    const clearSelection = () => {
        setSelectedUser(null)
        onSelect(null as any) // Type assertion if parent expects optional
    }

    return (
        <div className="relative" ref={wrapperRef}>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

            {selectedUser ? (
                <div className="flex items-center justify-between p-2 border border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold overflow-hidden">
                            {selectedUser.avatar_url ? (
                                <img src={selectedUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                selectedUser.full_name?.[0]?.toUpperCase() || selectedUser.email[0].toUpperCase()
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{selectedUser.full_name || 'No Name'}</p>
                            <p className="text-xs text-gray-500">{selectedUser.email}</p>
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
            {isOpen && !selectedUser && (query.length > 0 || results.length > 0) && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.length === 0 && !isLoading ? (
                        <div className="p-3 text-sm text-gray-500 text-center">No users found</div>
                    ) : (
                        results.map((user) => (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => handleSelect(user)}
                                className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0 border-gray-50"
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold overflow-hidden">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{user.full_name || 'No Name'}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                {user.is_verified && <CheckCircledIcon className="w-4 h-4 text-green-500" />}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
