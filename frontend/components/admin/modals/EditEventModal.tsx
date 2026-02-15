'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { EventDetails } from '@/services/api.types'
import { adminService } from '@/services/admin.service'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import PlacesAutocomplete, { geocodeByAddress } from 'react-places-autocomplete'
import { useLoadScript } from '@react-google-maps/api'
import api from '@/services/api'
import { UserResponse } from '@/services/api.types'
import { UserSearchSelect } from '@/components/admin/UserSearchSelect'
import { CategorySearchSelect } from '@/components/admin/CategorySearchSelect'

const libraries: ("places")[] = ["places"]

interface EditEventModalProps {
    isOpen: boolean
    onClose: () => void
    event: EventDetails
    onSuccess: () => void
}

export function EditEventModal({ isOpen, onClose, event, onSuccess }: EditEventModalProps) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    })
    const [isLoading, setIsLoading] = useState(false)
    const [venueSearch, setVenueSearch] = useState('')
    const [regStatus, setRegStatus] = useState<'opened' | 'closed'>(event.registration_status || 'closed')

    // Track category selections
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

    const [files, setFiles] = useState<{ cover: File | null; logo: File | null; paymentQR: File | null }>({ cover: null, logo: null, paymentQR: null })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'logo' | 'paymentQR') => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [type]: e.target.files![0] }))
        }
    }

    const [formData, setFormData] = useState({
        organizer_id: '',
        title: '',
        description: '',
        start_datetime: '',
        end_datetime: '',
        venue_remark: '',
        venue_place_id: '',
        max_participant: 0,
        meeting_url: '',
        price: 0
    })

    useEffect(() => {
        if (isOpen && event) {
            // Helper to get local datetime string for input
            const toLocalString = (dateStr: string) => {
                if (!dateStr) return ''
                const date = new Date(dateStr)
                // Adjustment to get local time in ISO string format (which is always UTC)
                // We create a new date shifted by the timezone offset
                const tzOffset = date.getTimezoneOffset() * 60000
                const localDate = new Date(date.getTime() - tzOffset)
                return localDate.toISOString().slice(0, 16)
            }

            setFormData({
                organizer_id: event.organizer_id || '',
                title: event.title || '',
                description: event.description || '',
                start_datetime: event.start_datetime ? toLocalString(event.start_datetime) : '',
                end_datetime: event.end_datetime ? toLocalString(event.end_datetime) : '',
                venue_remark: event.venue_remark || '',
                venue_place_id: event.venue_place_id || '',
                max_participant: event.max_participant || 0,
                meeting_url: event.meeting_url || '',
                price: event.price || 0
            })

            // Initialize selected categories from event
            if (event.categories && Array.isArray(event.categories)) {
                const categoryIds = event.categories.map((c: any) =>
                    typeof c === 'string' ? c : c.id
                )
                setSelectedCategoryIds(categoryIds)
            }
        }
    }, [isOpen, event])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            // Helper to convert datetime-local string to ISO string with timezone offset
            const toOffsetString = (localDateTimeStr: string) => {
                if (!localDateTimeStr) return undefined
                // datetime-local format: "YYYY-MM-DDTHH:mm"
                // We use format(..., "...XXX") to include the offset (e.g. +08:00)
                // This ensures the backend knows the exact local time and timezone.
                return format(new Date(localDateTimeStr), "yyyy-MM-dd'T'HH:mm:ssXXX")
            }

            await adminService.updateEvent(event.id, {
                organizer_id: formData.organizer_id || null, // Sanitize empty string to null
                title: formData.title,
                description: formData.description,
                start_datetime: toOffsetString(formData.start_datetime),
                end_datetime: toOffsetString(formData.end_datetime),
                venue_remark: formData.venue_remark,
                venue_place_id: formData.venue_place_id,
                max_participant: formData.max_participant,
                price: formData.price
            })

            if (files.cover) {
                try {
                    await adminService.updateEventCover(event.id, files.cover)
                } catch (e) { console.error('Cover upload failed', e); toast.error('Cover upload failed') }
            }
            if (files.logo) {
                try {
                    await adminService.updateEventLogo(event.id, files.logo)
                } catch (e) { console.error('Logo upload failed', e); toast.error('Logo upload failed') }
            }
            toast.success('Event updated successfully')
            onSuccess()
            onClose()
        } catch (error) {
            toast.error('Failed to update event')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const [activeTab, setActiveTab] = useState<'details' | 'location' | 'settings' | 'payment' | 'media'>('details')

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-0 rounded-2xl shadow-2xl z-50 w-full max-w-2xl outline-none max-h-[90vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10">
                        <div>
                            <Dialog.Title className="text-xl font-bold text-gray-900">Edit Event</Dialog.Title>
                            <p className="text-xs text-gray-500 mt-1">
                                {event.type === 'online' ? 'Online Event' : 'Physical Event'} • {event.format}
                            </p>
                        </div>
                        <Dialog.Close className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-500" />
                        </Dialog.Close>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 px-6 bg-gray-50/50">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Details
                        </button>
                        <button
                            onClick={() => setActiveTab('location')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'location' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {event.type === 'online' ? 'Meeting Link' : 'Venue'}
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Settings & Owner
                        </button>
                        <button
                            onClick={() => setActiveTab('payment')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'payment' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Payment & Organization
                        </button>
                        <button
                            onClick={() => setActiveTab('media')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'media' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Media
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <form id="edit-event-form" onSubmit={handleSubmit} className="space-y-6">
                            {activeTab === 'details' && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                        <input
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-40 resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.start_datetime}
                                                onChange={e => setFormData({ ...formData, start_datetime: e.target.value })}
                                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.end_datetime}
                                                onChange={e => setFormData({ ...formData, end_datetime: e.target.value })}
                                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'location' && (
                                <div className="space-y-4 animate-fadeIn">
                                    {event.type === 'online' ? (
                                        <div>
                                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                                                <p className="text-sm text-blue-800 font-medium">This is an Online Event</p>
                                                <p className="text-xs text-blue-600 mt-1">Participants will see this link 30 minutes before the event starts.</p>
                                            </div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting URL</label>
                                            <input
                                                type="url"
                                                value={formData.meeting_url || ''}
                                                onChange={e => setFormData({ ...formData, meeting_url: e.target.value })}
                                                placeholder="https://zoom.us/..."
                                                className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative z-20">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Search (Google Maps)</label>
                                                {isLoaded ? (
                                                    <PlacesAutocomplete
                                                        value={venueSearch}
                                                        onChange={(address) => setVenueSearch(address)}
                                                        onSelect={async (address) => {
                                                            setVenueSearch(address)
                                                            try {
                                                                const results = await geocodeByAddress(address)
                                                                if (results && results[0]) {
                                                                    const placeId = results[0].place_id
                                                                    setFormData(prev => ({ ...prev, venue_place_id: placeId }))
                                                                    toast.success("Venue location selected")
                                                                }
                                                            } catch (error) {
                                                                console.error('Error selecting place', error)
                                                                toast.error("Failed to select location")
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
                                                        value={venueSearch}
                                                        disabled
                                                        className="w-full text-gray-900 bg-gray-100 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        placeholder="Maps loading..."
                                                    />
                                                )}
                                                {formData.venue_place_id && <div className="text-xs text-green-600 mt-1">✓ Location set (ID: {formData.venue_place_id})</div>}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Remark</label>
                                                <input
                                                    value={formData.venue_remark}
                                                    onChange={e => setFormData({ ...formData, venue_remark: e.target.value })}
                                                    className="w-full text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                    placeholder="E.g. Level 2, Room 101, Gate B..."
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Participation Capacity</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                value={formData.max_participant}
                                                onChange={e => setFormData({ ...formData, max_participant: parseInt(e.target.value) })}
                                                className="w-32 text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                min={0}
                                            />
                                            <span className="text-xs text-gray-500">Set to 0 for unlimited</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Event Status</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['published', 'draft', 'cancelled'] as const).map(status => (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            if (status === 'published') {
                                                                await adminService.publishEvent(event.id)
                                                                toast.success('Event Published')
                                                            } else if (status === 'draft') {
                                                                await adminService.unpublishEvent(event.id)
                                                                toast.success('Event Unpublished')
                                                            } else {
                                                                await adminService.updateEvent(event.id, { status: 'cancelled' })
                                                                toast.success('Event Cancelled')
                                                            }
                                                            onSuccess()
                                                        } catch (error) {
                                                            toast.error(`Failed to update status`)
                                                        }
                                                    }}
                                                    className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all capitalize ${event.status === status
                                                        ? status === 'published' ? 'border-green-500 bg-green-50 text-green-700' :
                                                            status === 'draft' ? 'border-gray-500 bg-gray-50 text-gray-700' :
                                                                'border-red-500 bg-red-50 text-red-700'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {status === 'published' && '✓ '}
                                                    {status === 'draft' && '○ '}
                                                    {status === 'cancelled' && '✕ '}
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500">Published events are visible to all users. Draft events are hidden.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Registration Type</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        await adminService.updateEvent(event.id, { registration_type: 'free' })
                                                        toast.success('Event is now Free')
                                                        onSuccess()
                                                    } catch (error) {
                                                        toast.error('Failed to update')
                                                    }
                                                }}
                                                className={`px-4 py-3 text-sm font-bold rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${event.registration_type === 'free'
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                    }`}
                                            >
                                                🆓 Free Event
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        await adminService.updateEvent(event.id, { registration_type: 'paid' })
                                                        toast.success('Event is now Paid')
                                                        onSuccess()
                                                    } catch (error) {
                                                        toast.error('Failed to update')
                                                    }
                                                }}
                                                className={`px-4 py-3 text-sm font-bold rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${event.registration_type === 'paid'
                                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                    }`}
                                            >
                                                💰 Paid Event
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500">Free events have no entry fee. Paid events require payment verification.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Registration Status</label>
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ${regStatus === 'opened' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <span className="text-sm font-medium text-gray-900 uppercase">{regStatus === 'opened' ? 'Open' : 'Closed'}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        if (regStatus === 'opened') {
                                                            await adminService.closeRegistration(event.id)
                                                            setRegStatus('closed')
                                                            toast.success('Registration Closed')
                                                        } else {
                                                            await adminService.openRegistration(event.id)
                                                            setRegStatus('opened')
                                                            toast.success('Registration Opened')
                                                        }
                                                        onSuccess()
                                                    } catch (error) {
                                                        toast.error('Failed to update status')
                                                    }
                                                }}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${regStatus === 'opened'
                                                    ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
                                                    : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                                                    }`}
                                            >
                                                {regStatus === 'opened' ? 'Close Registration' : 'Open Registration'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500">Controls whether users can register for this event.</p>
                                    </div>


                                    {event.registration_type === 'paid' && (
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Ticket Price (RM)</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    value={formData.price}
                                                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                                    className="w-32 text-gray-900 bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                    min={0}
                                                    step={0.01}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Auto-Accept Registration</label>
                                                <p className="text-xs text-gray-500">Automatically approve participants upon registration</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        const newVal = !event.auto_accept_registration
                                                        await adminService.updateEvent(event.id, { auto_accept_registration: newVal })
                                                        toast.success(`Auto-accept ${newVal ? 'enabled' : 'disabled'}`)
                                                        onSuccess()
                                                    } catch (error) {
                                                        toast.error('Failed to update')
                                                    }
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${event.auto_accept_registration ? 'bg-blue-600' : 'bg-gray-200'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${event.auto_accept_registration ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Attendance Tracking</label>
                                                <p className="text-xs text-gray-500">Enable attendance taking features for this event</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        const newVal = !event.is_attendance_enabled
                                                        await adminService.updateEvent(event.id, { is_attendance_enabled: newVal })
                                                        toast.success(`Attendance tracking ${newVal ? 'enabled' : 'disabled'}`)
                                                        onSuccess()
                                                    } catch (error) {
                                                        toast.error('Failed to update')
                                                    }
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${event.is_attendance_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${event.is_attendance_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-100">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Event Organizer (Transfer Ownership)</label>
                                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                                            <div className="mb-4">
                                                <p className="text-sm font-medium text-gray-900">Current Organizer ID: <span className="font-mono text-gray-500">{event.organizer_id}</span></p>
                                                {event.organizer_name && <p className="text-sm text-gray-600">Name: {event.organizer_name}</p>}
                                            </div>

                                            <UserSearchSelect
                                                label="New Organizer"
                                                placeholder="Search user to transfer ownership..."
                                                onSelect={(user) => {
                                                    if (user) {
                                                        setFormData(prev => ({ ...prev, organizer_id: user.id }))
                                                    } else {
                                                        setFormData(prev => ({ ...prev, organizer_id: event.organizer_id }))
                                                    }
                                                }}
                                            />
                                            <p className="text-xs text-gray-400 mt-2">
                                                Warning: Transferring ownership will remove the current organizer's control over the event.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'payment' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                        <p className="text-sm font-bold text-amber-900">💰 Payment & Organization Settings</p>
                                        <p className="text-xs text-amber-700 mt-1">Manage payment QR, organization assignment, categories, and visibility.</p>
                                    </div>

                                    {/* Payment QR Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment QR Code</label>
                                        <div className="flex items-start gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                            {event.payment_qr_url && !files.paymentQR && (
                                                <img src={event.payment_qr_url} className="w-24 h-24 object-cover rounded-lg bg-gray-100" alt="Payment QR" />
                                            )}
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => handleFileChange(e, 'paymentQR')}
                                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                                />
                                                <p className="text-xs text-gray-500 mt-2">Upload QR code for payment. Participants will see this when registering.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visibility Toggle */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Event Visibility</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        await adminService.updateEvent(event.id, { visibility: 'public' })
                                                        toast.success('Event is now Public')
                                                        onSuccess()
                                                    } catch (error) {
                                                        toast.error('Failed to update visibility')
                                                    }
                                                }}
                                                className={`px-4 py-3 text-sm font-bold rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${event.visibility === 'public'
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                    }`}
                                            >
                                                🌐 Public Event
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        await adminService.updateEvent(event.id, { visibility: 'private' })
                                                        toast.success('Event is now Private')
                                                        onSuccess()
                                                    } catch (error) {
                                                        toast.error('Failed to update visibility')
                                                    }
                                                }}
                                                className={`px-4 py-3 text-sm font-bold rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${event.visibility === 'private'
                                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                    }`}
                                            >
                                                🔒 Private Event
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {event.visibility === 'public' ? 'Anyone can discover and view this event' : 'Only invited participants can see this event'}
                                        </p>
                                    </div>

                                    {/* Organization Selector */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Organization Assignment</label>
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                            <p className="text-sm text-gray-600 mb-3">Current: <span className="font-mono text-xs bg-white px-2 py-1 rounded">{event.organization_id || 'None'}</span></p>
                                            <p className="text-xs text-gray-400">Organization selector coming soon - requires API integration</p>
                                        </div>
                                    </div>

                                    {/* Categories Search Select */}
                                    <CategorySearchSelect
                                        label="Event Categories"
                                        selectedCategoryIds={selectedCategoryIds}
                                        onChange={async (newIds) => {
                                            setSelectedCategoryIds(newIds)
                                            try {
                                                await adminService.updateEvent(event.id, { categories: newIds })
                                                toast.success('Categories updated')
                                                onSuccess()
                                            } catch (error) {
                                                toast.error('Failed to update categories')
                                                setSelectedCategoryIds(selectedCategoryIds)
                                            }
                                        }}
                                        placeholder="Search and select categories..."
                                    />
                                </div>
                            )}

                            {activeTab === 'media' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
                                        <div className="flex items-start gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                            {event.cover_url && !files.cover && (
                                                <img src={event.cover_url} className="w-24 h-16 object-cover rounded-lg bg-gray-100" />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => handleFileChange(e, 'cover')}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Event Logo</label>
                                        <div className="flex items-start gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                            {event.logo_url && !files.logo && (
                                                <img src={event.logo_url} className="w-16 h-16 object-cover rounded-lg bg-gray-100" />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => handleFileChange(e, 'logo')}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Footer - Always Visible */}
                    <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center z-10">
                        <div className="text-xs text-gray-400">
                            ID: {event.id.slice(0, 8)}...
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="edit-event-form"
                                disabled={isLoading}
                                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Saving Changes...' : 'Save Updates'}
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
