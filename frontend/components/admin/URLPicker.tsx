'use client'

import { useState } from 'react'

interface URLPickerProps {
    value: string
    onChange: (url: string) => void
}

const COMMON_URLS = [
    { label: 'Dashboard', value: '/dashboard' },
    { label: 'Events', value: '/events' },
    { label: 'My Events', value: '/my-events' },
    { label: 'Profile', value: '/profile' },
    { label: 'Organizations', value: '/organizations' },
    { label: 'Admin Panel', value: '/admin' },
    { label: 'Admin - Users', value: '/admin/users' },
    { label: 'Admin - Events', value: '/admin/events' },
    { label: 'Admin - Organizations', value: '/admin/organizations' },
    { label: 'Admin - Categories', value: '/admin/categories' },
    { label: 'Admin - Notifications', value: '/admin/notifications' },
    { label: 'Settings', value: '/settings' },
    { label: 'Notifications', value: '/notifications' },
]

export function URLPicker({ value, onChange }: URLPickerProps) {
    const [mode, setMode] = useState<'select' | 'custom'>('select')

    return (
        <div>
            <div className="flex gap-3 mb-2">
                <button
                    type="button"
                    onClick={() => setMode('select')}
                    className={`text-sm px-3 py-1 rounded-lg transition-colors ${mode === 'select'
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    Select from list
                </button>
                <button
                    type="button"
                    onClick={() => setMode('custom')}
                    className={`text-sm px-3 py-1 rounded-lg transition-colors ${mode === 'custom'
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    Custom URL
                </button>
            </div>

            {mode === 'select' ? (
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="text-gray-700 w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-yellow-400 focus:ring-0 transition-colors"
                >
                    <option value="">No link</option>
                    {COMMON_URLS.map(url => (
                        <option key={url.value} value={url.value}>
                            {url.label} ({url.value})
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="text-gray-700 w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-yellow-400 focus:ring-0 transition-colors"
                    placeholder="/custom/path"
                />
            )}
        </div>
    )
}
