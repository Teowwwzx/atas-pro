'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEvent, pingApi, getMyOrganizations, listCategories, attachEventCategories } from '@/services/api'
import { FormInput } from '@/components/auth/FormInput'
import { EventCreate, EventType, OrganizationResponse, CategoryResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete'
import { useLoadScript } from '@react-google-maps/api'
import { UserCreateOrganizationModal } from '@/components/modals/UserCreateOrganizationModal'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { ChevronDownIcon, UpdateIcon } from '@radix-ui/react-icons'
import { CategorySearchSelect } from '@/components/admin/CategorySearchSelect'
import { showDraftRestoreToast } from '@/components/ui/DraftRestoreToast'

const libraries: ("places")[] = ["places"]
import { format } from 'date-fns'

export default function CreateEventPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showOptional, setShowOptional] = useState(false)
    const [activeTab, setActiveTab] = useState<'payment' | 'organization' | 'media'>('payment')

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    })

    const [formData, setFormData] = useState<EventCreate>({
        title: '',
        description: '',
        format: 'workshop',
        type: 'physical',
        start_datetime: '',
        end_datetime: '',
        registration_type: 'free',
        visibility: 'public',
        venue_remark: 'Asia Pacific University',
        venue_place_id: '',
        meeting_url: '',
        price: undefined,
        currency: 'MYR',  // Always MYR, not exposed in UI
        payment_qr_url: undefined,
        max_participant: undefined,
        cover_url: undefined,
        logo_url: undefined,
    })

    const [organizations, setOrganizations] = useState<OrganizationResponse[]>([])
    const [showOrgModal, setShowOrgModal] = useState(false)
    const [allCategories, setAllCategories] = useState<CategoryResponse[]>([])
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [categorySearch, setCategorySearch] = useState('')

    // Load draft on mount
    const isRestoring = React.useRef(false)
    const restoredDraft = React.useRef(false)
    const hasUserEditedSinceRestore = React.useRef(false)
    const markUserEdited = () => {
        if (restoredDraft.current) hasUserEditedSinceRestore.current = true
    }
    useEffect(() => {
        showDraftRestoreToast('event_create_draft', (data) => {
            isRestoring.current = true
            restoredDraft.current = true
            hasUserEditedSinceRestore.current = false
            setFormData(prev => ({ ...prev, ...data }))
            // Reset restoring flag after a short delay to allow subsequent edits to save
            setTimeout(() => {
                isRestoring.current = false
            }, 1100)
        })
    }, [])

    // Fetch organizations and categories on mount
    useEffect(() => {
        getMyOrganizations()
            .then(setOrganizations)
            .catch(console.error)
        
        listCategories()
            .then(setAllCategories)
            .catch(console.error)
    }, [])

    // Save draft on change
    useEffect(() => {
        if (isRestoring.current) return
        if (restoredDraft.current && !hasUserEditedSinceRestore.current) return

        const handler = setTimeout(() => {
            // Only save if there's actual content to avoid saving empty drafts
            if (formData.title || formData.description || formData.start_datetime) {
                localStorage.setItem('event_create_draft', JSON.stringify(formData))
            }
        }, 1000)
        return () => clearTimeout(handler)
    }, [formData])

    const handleSelect = async (address: string) => {
        markUserEdited()
        setFormData(prev => ({ ...prev, venue_remark: address }))
        try {
            const results = await geocodeByAddress(address)
            const placeId = results[0].place_id
            setFormData(prev => ({ ...prev, venue_place_id: placeId }))
        } catch (error) {
            console.error('Error selecting place', error)
        }
    }

    const toLocalInputValue = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0')
        const year = d.getFullYear()
        const month = pad(d.getMonth() + 1)
        const day = pad(d.getDate())
        const hours = pad(d.getHours())
        const minutes = pad(d.getMinutes())
        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    const minStart = toLocalInputValue(new Date())
    const minEnd = formData.start_datetime || minStart

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        markUserEdited()
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // Validation
        if (!formData.title || !formData.start_datetime || !formData.end_datetime) {
            setError('Please fill in all required fields')
            setLoading(false)
            return
        }

        // Word count validation
        const wordCount = formData.title.trim().split(/\s+/).length
        if (wordCount > 15) {
            setError(`Title cannot exceed 15 words (current: ${wordCount})`)
            setLoading(false)
            return
        }

        try {
            if (new Date(formData.end_datetime) <= new Date(formData.start_datetime)) {
                toast.error('End date must be after start date')
                setLoading(false)
                return
            }

            // Validate paid event fields
            if (formData.registration_type === 'paid') {
                if (!formData.price || formData.price <= 0) {
                    toast.error('Price must be greater than 0 for paid events')
                    setLoading(false)
                    return
                }
                if (!formData.payment_qr_url) {
                    toast.error('Payment QR code is required for paid events')
                    setLoading(false)
                    return
                }
            }

            // Clean up payload
            const payload = {
                ...formData,
                // Use format with XXX to include timezone offset (e.g. +08:00) explicitly
                // This prevents issues where UTC conversion might be misinterpreted
                start_datetime: format(new Date(formData.start_datetime), "yyyy-MM-dd'T'HH:mm:ssXXX"),
                end_datetime: format(new Date(formData.end_datetime), "yyyy-MM-dd'T'HH:mm:ssXXX"),
                venue_place_id: formData.venue_place_id || null,
                venue_remark: formData.venue_remark || null,
                meeting_url: formData.meeting_url || null,
                max_participant: formData.max_participant || null,
                price: formData.price || 0,
                description: formData.description || undefined,
                logo_url: formData.logo_url || undefined,
                cover_url: formData.cover_url || null,
            }

            await pingApi()
            const newEvent = await createEvent(payload)

            // Attach categories
            if (selectedCategories.length > 0) {
                await attachEventCategories(newEvent.id, { category_ids: selectedCategories })
            }

            localStorage.removeItem('event_create_draft')
            toast.success('Event created successfully')
            router.push(`/events/${newEvent.id}`)
        } catch (err: any) {
            console.error(err)
            if (err.response?.status === 401) {
                localStorage.removeItem('atas_token')
                const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
                router.push(`/login?redirect=${returnUrl}`)
                return
            }
            if (err.response?.data?.detail) {
                toast.error(err.response.data.detail)
            } else if (err.message) {
                toast.error(err.message)
            } else {
                toast.error('Failed to create event')
            }
        }
        finally {
            setLoading(false)
        }
    }

    // Auto-matching logic
    useEffect(() => {
        if (formData.format === 'webinar') {
            setFormData(prev => ({ ...prev, type: 'online', venue_remark: 'Zoom / Google Meet' }))
        } else if (formData.format === 'panel_discussion') {
            setFormData(prev => ({ ...prev, type: 'physical' }))
            if (!formData.venue_remark) {
                setFormData(prev => ({ ...prev, venue_remark: 'Asia Pacific University' }))
            }
        }
    }, [formData.format])

    // Fix: Auto-fetch Place ID for default venue
    useEffect(() => {
        const fetchDefaultPlaceId = async () => {
            if (formData.venue_remark === 'Asia Pacific University' && !formData.venue_place_id && isLoaded) {
                try {
                    const results = await geocodeByAddress('Asia Pacific University of Technology & Innovation (APU)')
                    if (results && results[0]) {
                        setFormData(prev => ({ ...prev, venue_place_id: results[0].place_id, venue_remark: results[0].formatted_address }))
                    }
                } catch (error) {
                    console.error('Failed to fetch default place ID', error)
                }
            }
        }
        fetchDefaultPlaceId()
    }, [isLoaded, formData.venue_remark])

    const handleOrgCreated = (orgId: string) => {
        getMyOrganizations().then(orgs => {
            setOrganizations(orgs)
            markUserEdited()
            setFormData(prev => ({ ...prev, organization_id: orgId }))
        })
    }

    return (
        <div className="max-w-3xl mx-auto bg-white p-10 rounded-[2.5rem] shadow-sm border border-yellow-100">
            <UserCreateOrganizationModal
                isOpen={showOrgModal}
                onClose={() => setShowOrgModal(false)}
                onSuccess={handleOrgCreated}
            />
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Create New Event</h1>
                <p className="text-zinc-700 mt-2 font-medium">Fill in the details to host your awesome event.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">


                <FormInput
                    id="title"
                    label="Event Title"
                    placeholder="e.g. Intro to React Workshop"
                    value={formData.title}
                    onChange={handleChange}
                />

                <div>
                    <CategorySearchSelect
                        label="Categories"
                        selectedCategoryIds={selectedCategories}
                        onChange={setSelectedCategories}
                        placeholder="Search or create categories..."
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                        Description
                    </label>
                    <div className="mt-1">
                        <textarea
                            id="description"
                            name="description"
                            rows={4}
                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-700 font-medium py-4 px-5 transition-all duration-200"
                            placeholder="Describe your event..."
                            value={formData.description || ''}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-2">
                    <div>
                        <label htmlFor="start_datetime" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                            Start Date & Time
                        </label>
                        <div className="mt-1">
                            <input
                                type="datetime-local"
                                name="start_datetime"
                                id="start_datetime"
                                required
                                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-700 font-medium py-4 px-5 transition-all duration-200"
                                min={minStart}
                                value={formData.start_datetime}
                                onChange={(e) => {
                                    markUserEdited()
                                    const v = e.target.value
                                    const clamped = v && v < minStart ? minStart : v
                                    setFormData(prev => ({ ...prev, start_datetime: clamped }))
                                    if (formData.end_datetime && clamped && formData.end_datetime < clamped) {
                                        setFormData(prev => ({ ...prev, end_datetime: clamped }))
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="end_datetime" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                            End Date & Time
                        </label>
                        <div className="mt-1">
                            <input
                                type="datetime-local"
                                name="end_datetime"
                                id="end_datetime"
                                required
                                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-700 font-medium py-4 px-5 transition-all duration-200"
                                min={minEnd}
                                value={formData.end_datetime}
                                onChange={(e) => {
                                    markUserEdited()
                                    const v = e.target.value
                                    const minV = minEnd
                                    const clamped = v && v < minV ? minV : v
                                    setFormData(prev => ({ ...prev, end_datetime: clamped }))
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="format" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                            Format
                        </label>
                        <select
                            id="format"
                            name="format"
                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-700 font-medium py-4 px-5 transition-all duration-200"
                            value={formData.format}
                            onChange={handleChange}
                        >
                            <option value="workshop">Workshop</option>
                            <option value="seminar">Seminar</option>
                            <option value="webinar">Webinar</option>
                            <option value="panel_discussion">Panel Discussion</option>
                            <option value="club_event">Club Event</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="type" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                            Type
                        </label>
                        <select
                            id="type"
                            name="type"
                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-700 font-medium py-4 px-5 transition-all duration-200"
                            value={formData.type}
                            onChange={handleChange}
                        >
                            <option value="physical">Physical</option>
                            <option value="online">Online</option>
                            <option value="hybrid">Hybrid</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="registration_type" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                            Registration
                        </label>
                        <select
                            id="registration_type"
                            name="registration_type"
                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-700 font-medium py-4 px-5 transition-all duration-200"
                            value={formData.registration_type}
                            onChange={handleChange}
                        >
                            <option value="free">Free</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="visibility" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                            Visibility
                        </label>
                        <select
                            id="visibility"
                            name="visibility"
                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-700 font-medium py-4 px-5 transition-all duration-200"
                            value={formData.visibility}
                            onChange={handleChange}
                        >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                        </select>
                    </div>
                </div>

                <div className="relative z-20">
                    <label htmlFor={formData.type === 'online' ? "meeting_url" : "venue_remark"} className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                        {formData.type === 'online' ? "Meeting URL / Link" : "Venue / Location"}
                    </label>

                    {formData.type === 'online' ? (
                        <input
                            type="url"
                            id="meeting_url"
                            name="meeting_url"
                            className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-700 font-medium py-4 px-5 transition-all duration-200"
                            placeholder="e.g. https://zoom.us/j/123456789"
                            value={formData.meeting_url || ''}
                            onChange={handleChange}
                        />
                    ) : (
                        isLoaded ? (
                            <PlacesAutocomplete
                                value={formData.venue_remark || ''}
                                onChange={(address) => {
                                    markUserEdited()
                                    setFormData(prev => ({ ...prev, venue_remark: address }))
                                }}
                                onSelect={handleSelect}
                            >
                                {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                                    <div className="relative">
                                        <input
                                            {...getInputProps({
                                                placeholder: 'Search for a location...',
                                                className: "block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-700 font-medium py-4 px-5 transition-all duration-200"
                                            })}
                                        />
                                        {suggestions.length > 0 && (
                                            <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden">
                                                {loading && <div className="p-3 text-sm text-zinc-500">Loading...</div>}
                                                {suggestions.map((suggestion) => {
                                                    const className = suggestion.active
                                                        ? 'px-4 py-3 bg-yellow-50 cursor-pointer'
                                                        : 'px-4 py-3 bg-white cursor-pointer hover:bg-gray-50';

                                                    // Create a div wrapper to hold props and content to avoid duplicate key issues or spread issues
                                                    const { key, ...optionProps } = getSuggestionItemProps(suggestion, { className });

                                                    return (
                                                        <div
                                                            key={suggestion.placeId}
                                                            {...optionProps}
                                                        >
                                                            <div className="font-bold text-zinc-900 text-sm">{suggestion.formattedSuggestion.mainText}</div>
                                                            <div className="text-xs text-zinc-500">{suggestion.formattedSuggestion.secondaryText}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </PlacesAutocomplete>
                        ) : (
                            <div className="w-full px-5 py-4 bg-zinc-100 rounded-2xl text-zinc-500 font-medium">
                                Loading Maps...
                            </div>
                        )
                    )}
                </div>

                {/* Optional Settings with Tabs */}
                <div className="mt-8">
                    <button
                        type="button"
                        onClick={() => setShowOptional(!showOptional)}
                        className="flex items-center justify-between w-full p-5 bg-zinc-50 rounded-2xl hover:bg-zinc-100 transition-colors border-2 border-transparent hover:border-zinc-200"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-base font-black text-zinc-900">
                                Optional Settings
                            </span>
                            <span className="text-xs text-zinc-500 font-medium">
                                (Payment, organization, media, etc.)
                            </span>
                        </div>
                        <ChevronDownIcon
                            className={`w-5 h-5 text-zinc-600 transition-transform duration-200 ${showOptional ? 'rotate-180' : ''
                                }`}
                        />
                    </button>

                    {showOptional && (
                        <div className="mt-4 bg-white rounded-2xl border-2 border-zinc-100">
                            {/* Tabs */}
                            <div className="flex border-b border-zinc-200">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('payment')}
                                    className={`flex-1 px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'payment'
                                        ? 'text-zinc-900 border-b-2 border-yellow-400 bg-yellow-50'
                                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                                        }`}
                                >
                                    💰 Payment
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('organization')}
                                    className={`flex-1 px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'organization'
                                        ? 'text-zinc-900 border-b-2 border-yellow-400 bg-yellow-50'
                                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                                        }`}
                                >
                                    🏢 Organization
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('media')}
                                    className={`flex-1 px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'media'
                                        ? 'text-zinc-900 border-b-2 border-yellow-400 bg-yellow-50'
                                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                                        }`}
                                >
                                    🎨 Media
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="p-6">
                                {/* Payment Tab */}
                                {activeTab === 'payment' && (
                                    <div className="space-y-6">
                                        {formData.registration_type === 'paid' ? (
                                            <>
                                                <div>
                                                    <label htmlFor="price" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                                                        Price (RM) *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        id="price"
                                                        name="price"
                                                        min="0"
                                                        step="0.01"
                                                        required
                                                        className="block w-full rounded-2xl bg-white border-gray-300 focus:border-yellow-400 focus:ring-0 text-zinc-700 font-medium py-4 px-5 transition-all duration-200"
                                                        placeholder="e.g., 50.00"
                                                        value={formData.price || ''}
                                                        onChange={handleChange}
                                                    />
                                                    <p className="text-xs text-zinc-500 mt-2 ml-1">
                                                        Price in Malaysian Ringgit (MYR)
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                                                        Payment QR Code *
                                                    </label>
                                                    <ImageUpload
                                                        value={formData.payment_qr_url || null}
                                                        onChange={(url) => {
                                                            markUserEdited()
                                                            setFormData(prev => ({ ...prev, payment_qr_url: url || undefined }))
                                                        }}
                                                        placeholder="Upload Payment QR"
                                                        helpText="Upload your DuitNow, TNG, or bank transfer QR code"
                                                        maxSizeMB={2}
                                                    />
                                                    {!formData.payment_qr_url && (
                                                        <p className="text-xs text-red-600 mt-2 ml-1 font-medium">
                                                            Payment QR code is required for paid events
                                                        </p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-8 text-zinc-500">
                                                <p className="text-sm font-medium">
                                                    This event is set to <span className="font-bold text-zinc-700">Free</span> registration.
                                                </p>
                                                <p className="text-xs mt-2">
                                                    Change to "Paid" registration above to set pricing.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Organization Tab */}
                                {activeTab === 'organization' && (
                                    <div className="space-y-6">
                                        <div>
                                            <label htmlFor="organization" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                                                Organization
                                            </label>
                                            <select
                                                id="organization"
                                                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-700 font-medium py-4 px-5 transition-all duration-200"
                                                value={formData.organization_id || ''}
                                                onChange={(e) => {
                                                    if (e.target.value === 'create_new') {
                                                        setShowOrgModal(true)
                                                    } else {
                                                        markUserEdited()
                                                        setFormData(prev => ({ ...prev, organization_id: e.target.value || undefined }))
                                                    }
                                                }}
                                            >
                                                <option value="">Personal (No Organization)</option>
                                                {organizations.map(org => (
                                                    <option key={org.id} value={org.id}>{org.name}</option>
                                                ))}
                                                <option value="create_new" className="font-bold text-yellow-600">+ Create New Organization...</option>
                                            </select>
                                            <p className="text-xs text-zinc-500 mt-2 ml-1">
                                                Associate this event with an organization (optional)
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Media Tab */}
                                {activeTab === 'media' && (
                                    <div className="space-y-6">
                                        <div>
                                            <label htmlFor="max_participant" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                                                Maximum Participants
                                            </label>
                                            <input
                                                type="number"
                                                id="max_participant"
                                                name="max_participant"
                                                min="1"
                                                className="block w-full rounded-2xl bg-white border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-700 font-medium py-4 px-5 transition-all duration-200"
                                                placeholder="Leave empty for unlimited"
                                                value={formData.max_participant || ''}
                                                onChange={handleChange}
                                            />
                                            <p className="text-xs text-zinc-500 mt-2 ml-1">
                                                Set a cap on registrations. Leave empty for no limit.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                                                Event Cover Image
                                            </label>
                                            <ImageUpload
                                                value={formData.cover_url || null}
                                                onChange={(url) => {
                                                    markUserEdited()
                                                    setFormData(prev => ({ ...prev, cover_url: url || undefined }))
                                                }}
                                                placeholder="Upload Cover Image"
                                                helpText="Recommended: 1920x1080px. Used in event cards and detail pages."
                                                maxSizeMB={5}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                                                Event Logo/Icon
                                            </label>
                                            <ImageUpload
                                                value={formData.logo_url || null}
                                                onChange={(url) => {
                                                    markUserEdited()
                                                    setFormData(prev => ({ ...prev, logo_url: url || undefined }))
                                                }}
                                                placeholder="Upload Logo"
                                                helpText="Recommended: 512x512px. Used in navigation and as event icon."
                                                maxSizeMB={2}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {
                    error && (
                        <div className="rounded-2xl bg-red-50 p-4 border border-red-100">
                            <div className="flex">
                                <div className="ml-3">
                                    <h3 className="text-sm font-bold text-red-800">Error</h3>
                                    <div className="mt-1 text-sm text-red-700 font-medium">
                                        <p>{error}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                <div className="flex flex-col items-end gap-2 pt-4">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-white text-zinc-900 rounded-full font-bold shadow-sm hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-yellow-400 text-zinc-900 rounded-full shadow-lg font-bold hover:bg-yellow-300 hover:scale-105 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <UpdateIcon className="w-4 h-4 animate-spin" />}
                            {loading ? 'Creating...' : 'Create Event'}
                        </button>
                    </div>
                    <p className="text-right text-xs font-medium text-zinc-400 mr-2">
                        <span className="text-yellow-400">Publish</span> later <br /> to make it visible to public
                    </p>
                </div>
            </form >
        </div >
    )
}
