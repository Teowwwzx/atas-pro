'use client'

import { useState, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon, ImageIcon } from '@radix-ui/react-icons'
import { adminService } from '@/services/admin.service'
import { toast } from 'react-hot-toast'
import { UserSearchSelect } from '@/components/admin/UserSearchSelect'
import { PlacesAutocomplete } from '@/components/ui/PlacesAutocomplete'
import { CategorySearchSelect } from '@/components/admin/CategorySearchSelect'
import { OrganizationSearchSelect } from '@/components/admin/OrganizationSearchSelect'
import { format } from 'date-fns'

interface CreateEventModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CreateEventModal({ isOpen, onClose, onSuccess }: CreateEventModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [createdEventId, setCreatedEventId] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_datetime: '',
        end_datetime: '',
        venue_place_id: '',
        venue_remark: '',
        max_participant: 100,
        type: 'physical',
        format: 'seminar',
        visibility: 'public',
        owner_id: '',
        registration_type: 'free',
        status: 'draft',
        organization_id: '',
        category_ids: [] as string[]
    })

    const [files, setFiles] = useState<{ cover: File | null; logo: File | null; paymentQR: File | null }>({ cover: null, logo: null, paymentQR: null })
    const coverRef = useRef<HTMLInputElement>(null)
    const logoRef = useRef<HTMLInputElement>(null)
    const paymentQRRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'logo' | 'paymentQR') => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [type]: e.target.files![0] }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            // Validate title word count
            const wordCount = formData.title.trim().split(/\s+/).length
            if (wordCount > 15) {
                toast.error(`Title cannot exceed 15 words (current: ${wordCount})`)
                setIsLoading(false)
                return
            }

            // Validate dates
            const start = new Date(formData.start_datetime)
            const end = new Date(formData.end_datetime)
            if (end <= start) {
                toast.error('End date must be after start date')
                setIsLoading(false)
                return
            }

            let eventId = createdEventId

            // Create Event (if not already created)
            if (!eventId) {
                const createdEvent = await adminService.createEvent({
                    title: formData.title,
                    description: formData.description,
                    start_datetime: format(start, "yyyy-MM-dd'T'HH:mm:ssXXX"),
                    end_datetime: format(end, "yyyy-MM-dd'T'HH:mm:ssXXX"),
                    venue_place_id: formData.venue_place_id,
                    venue_remark: formData.venue_remark,
                    max_participant: formData.max_participant,
                    type: formData.type,
                    format: formData.format,
                    visibility: formData.visibility,
                    registration_type: formData.registration_type,
                    organization_id: formData.organization_id || undefined,
                    categories: formData.category_ids || [],
                    status: formData.status
                })
                eventId = createdEvent.id
                setCreatedEventId(eventId)
            }

            if (!eventId) throw new Error('Failed to start event creation')

            // If owner_id specified, transfer ownership immediately
            if (formData.owner_id) {
                await adminService.updateEvent(eventId, {
                    organizer_id: formData.owner_id
                })
            }

            // Upload Files if any
            const uploadPromises = []
            if (files.cover) {
                uploadPromises.push(adminService.updateEventCover(eventId, files.cover))
            }
            if (files.logo) {
                uploadPromises.push(adminService.updateEventLogo(eventId, files.logo))
            }
            if (files.paymentQR) {
                uploadPromises.push(adminService.updateEventPaymentQR(eventId, files.paymentQR))
            }

            if (uploadPromises.length > 0) {
                await Promise.all(uploadPromises).catch(() => {
                    toast.error('Some uploads failed, but event was created')
                })
            }

            toast.success('Event created and assigned successfully')
            onSuccess()
            onClose()

            // Reset form
            setFormData({
                title: '',
                description: '',
                start_datetime: '',
                end_datetime: '',
                venue_place_id: '',
                venue_remark: '',
                max_participant: 100,
                type: 'physical',
                format: 'seminar',
                visibility: 'public',
                owner_id: '',
                registration_type: 'free',
                status: 'draft',
                organization_id: '',
                category_ids: []
            })
            setFiles({ cover: null, logo: null, paymentQR: null })
            setCreatedEventId(null)
        } catch (error) {
            toast.error('Failed to complete event creation process')
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
                        <Dialog.Title className="text-xl font-bold text-gray-900">Create New Event</Dialog.Title>
                        <Dialog.Close className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-500" />
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Section: Basic Info */}
                        <div className="space-y-4 pt-1">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Event Title</label>
                                <input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                                    required
                                    placeholder="e.g. Annual Tech Symposium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                                    placeholder="Provide a compelling description..."
                                />
                            </div>
                        </div>

                        {/* Section: Organizer & Organization */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Event Organizer (Owner)</label>
                                <UserSearchSelect
                                    onSelect={(u) => setFormData({ ...formData, owner_id: u?.id || '' })}
                                    placeholder="Search user..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Organization (Optional)</label>
                                <OrganizationSearchSelect
                                    onSelect={(org) => setFormData({ ...formData, organization_id: org?.id || '' })}
                                    placeholder="Search organization..."
                                />
                            </div>
                        </div>

                        {/* Section: Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
                                <input
                                    type="datetime-local"
                                    value={formData.start_datetime}
                                    onChange={e => setFormData({ ...formData, start_datetime: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
                                <input
                                    type="datetime-local"
                                    value={formData.end_datetime}
                                    onChange={e => setFormData({ ...formData, end_datetime: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    required
                                />
                            </div>
                        </div>

                        {/* Section: Venue */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Venue (Local or Online)</label>
                            <PlacesAutocomplete
                                onPlaceSelect={(place: any) => setFormData({
                                    ...formData,
                                    venue_remark: place.label,
                                    venue_place_id: place.value?.place_id || ''
                                })}
                                defaultValue={formData.venue_remark}
                            />
                        </div>

                        {/* Section: Format & Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Format</label>
                                <select
                                    value={formData.format}
                                    onChange={e => setFormData({ ...formData, format: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    <option value="seminar">Seminar</option>
                                    <option value="panel_discussion">Panel Discussion</option>
                                    <option value="workshop">Workshop</option>
                                    <option value="webinar">Webinar</option>
                                    <option value="club_event">Club Event</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    <option value="physical">Physical</option>
                                    <option value="online">Online</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                        </div>

                        {/* Section: Visibility & Registration */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Visibility</label>
                                <select
                                    value={formData.visibility}
                                    onChange={e => setFormData({ ...formData, visibility: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    <option value="public">🌐 Public</option>
                                    <option value="private">🔒 Private</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Registration Type</label>
                                <select
                                    value={formData.registration_type}
                                    onChange={e => setFormData({ ...formData, registration_type: e.target.value })}
                                    className="w-full text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    <option value="free">🆓 Free</option>
                                    <option value="paid">💰 Paid</option>
                                </select>
                            </div>
                        </div>

                        {/* Section: Event Categories */}
                        <CategorySearchSelect
                            label="Event Categories"
                            selectedCategoryIds={formData.category_ids}
                            onChange={(ids) => setFormData({ ...formData, category_ids: ids })}
                            placeholder="Search and select categories..."
                        />

                        {/* Section: Payment QR (Conditional) */}
                        {formData.registration_type === 'paid' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Payment QR Code</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={paymentQRRef}
                                    onChange={e => handleFileChange(e, 'paymentQR')}
                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 border border-gray-200 rounded-lg"
                                />
                                <p className="text-xs text-gray-400 mt-1">Upload QR code for participants to make payment</p>
                            </div>
                        )}

                        {/* Section: Images */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" /> Cover
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={coverRef}
                                    onChange={e => handleFileChange(e, 'cover')}
                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" /> Logo
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={logoRef}
                                    onChange={e => handleFileChange(e, 'logo')}
                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                        </div>

                        <div className="flex items-center pt-2 gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={formData.status === 'published'}
                                        onChange={e => setFormData({ ...formData, status: e.target.checked ? 'published' : 'draft' })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </div>
                                <span className="text-sm font-medium text-gray-700">Publish directly</span>
                            </label>

                            <div className="flex-1"></div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
                            >
                                {isLoading ? 'Creating Event...' : 'Create & Assign Event'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
