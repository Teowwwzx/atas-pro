'use client'

import { useState, useEffect, useRef } from 'react'
import { getCategories, createCategory as createCategoryAdmin } from '@/services/api'
import { createCategoryPublic } from '@/services/api'
import { CategoryResponse } from '@/services/api.types'
import { MagnifyingGlassIcon, CheckCircledIcon, Cross2Icon } from '@radix-ui/react-icons'
import useSWR from 'swr'

interface CategorySearchSelectProps {
    label?: string
    selectedCategoryIds: string[]
    onChange: (ids: string[]) => void
    placeholder?: string
}

export function CategorySearchSelect({
    label,
    selectedCategoryIds,
    onChange,
    placeholder = "Search categories..."
}: CategorySearchSelectProps) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const { data: categories, isLoading } = useSWR('/categories', getCategories, {
        revalidateOnFocus: false
    })

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

    const filteredCategories = (categories || [])
        .filter(cat => cat.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10)

    const maxCategories = 3

    const toggleCategory = (categoryId: string) => {
        if (selectedCategoryIds.includes(categoryId)) {
            onChange(selectedCategoryIds.filter(id => id !== categoryId))
        } else {
            // Check if limit reached
            if (selectedCategoryIds.length >= maxCategories) {
                return // Don't add more if limit reached
            }
            onChange([...selectedCategoryIds, categoryId])
        }
    }

    const removeCategory = (categoryId: string) => {
        onChange(selectedCategoryIds.filter(id => id !== categoryId))
    }

    const selectedCategories = categories?.filter(cat =>
        selectedCategoryIds.includes(cat.id)
    ) || []

    const canCreate = (() => {
        const q = query.trim()
        if (q.length < 2) return false
        const exists = (categories || []).some(c => c.name.toLowerCase() === q.toLowerCase())
        return !exists
    })()

    const handleCreate = async () => {
        const name = query.trim()
        if (!name || name.length < 2) return
        try {
            const created = await createCategoryPublic({ name })
            if (selectedCategoryIds.length < maxCategories) {
                onChange([...selectedCategoryIds, created.id])
            }
            setQuery('')
            setIsOpen(false)
        } catch (e) {
            try {
                const createdAdmin = await createCategoryAdmin({ name })
                if (selectedCategoryIds.length < maxCategories) {
                    onChange([...selectedCategoryIds, createdAdmin.id])
                }
                setQuery('')
                setIsOpen(false)
            } catch { }
        }
    }

    return (
        <div className="relative" ref={wrapperRef}>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

            {/* Selected Categories Tags */}
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedCategories.map(cat => (
                    <div
                        key={cat.id}
                        className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200 text-xs font-bold"
                    >
                        <span>{cat.name}</span>
                        <button
                            type="button"
                            onClick={() => removeCategory(cat.id)}
                            className="hover:text-red-500 transition-colors"
                        >
                            <Cross2Icon className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                {selectedCategoryIds.length > 0 && (
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${selectedCategoryIds.length >= 3 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-600 border border-gray-200'
                        }`}>
                        {selectedCategoryIds.length}/3 selected
                    </div>
                )}
            </div>

            {/* Search Input */}
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

            {/* Dropdown Results */}
            {isOpen && query.trim().length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCategories.length > 0 && filteredCategories.map((cat) => {
                        const isSelected = selectedCategoryIds.includes(cat.id)
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                                className={`w-full flex items-center justify-between p-2 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0 border-gray-50 ${isSelected ? 'bg-blue-50/50' : ''}`}
                            >
                                <span className={`text-sm ${isSelected ? 'font-bold text-blue-700' : 'text-gray-900'}`}>
                                    {cat.name}
                                </span>
                                {isSelected && <CheckCircledIcon className="w-4 h-4 text-blue-500" />}
                            </button>
                        )
                    })}
                    {filteredCategories.length === 0 && !isLoading && (
                        <div className="p-3 text-sm text-gray-500 text-center">No categories found</div>
                    )}
                    {canCreate && (
                        <button
                            type="button"
                            onClick={handleCreate}
                            className="w-full p-2 text-left bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold transition-colors border-t border-amber-200"
                        >
                            Create “{query.trim()}”
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
