import React, { useState, useEffect } from 'react'
import { EventDetails } from '@/services/api.types'
import { updateEvent, openRegistration, closeRegistration, deleteEvent, uploadEventPaymentQR } from '@/services/api'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { DeleteEventModal } from '@/components/modals/DeleteEventModal'

interface DashboardTabSettingsProps {
    event: EventDetails
    onUpdate: () => void
    onDelete: () => void
    user?: any
    role?: string | null
}

export function DashboardTabSettings({ event, onUpdate, onDelete, user, role }: DashboardTabSettingsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [qrFile, setQrFile] = useState<File | null>(null)
    const [isUploadingQR, setIsUploadingQR] = useState(false)
    const [localPrice, setLocalPrice] = useState<string>(event.price?.toString() || '')

    useEffect(() => {
        setLocalPrice(event.price?.toString() || '')
    }, [event.price])

    const handlePriceBlur = async () => {
        const val = parseFloat(localPrice)
        if (isNaN(val)) return
        if (val === event.price) return

        setLoading(true)
        try {
            await updateEvent(event.id, { price: val })
            toast.success('Price updated')
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update price')
            setLocalPrice(event.price?.toString() || '')
        } finally {
            setLoading(false)
        }
    }

    const handleCurrencyChange = async (currency: string) => {
        setLoading(true)
        try {
            await updateEvent(event.id, { currency })
            toast.success('Currency updated')
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update currency')
        } finally {
            setLoading(false)
        }
    }

    // Derived states
    const isOngoing = new Date(event.start_datetime) <= new Date() && new Date(event.end_datetime) >= new Date()
    const isEnded = new Date(event.end_datetime) < new Date()
    const isConfigLocked = isOngoing || isEnded

    const toggleVisibility = async () => {
        setLoading(true)
        const newVisibility = event.visibility === 'public' ? 'private' : 'public'
        try {
            await updateEvent(event.id, { visibility: newVisibility })
            toast.success(`Event is now ${newVisibility}`)
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to change visibility')
        } finally {
            setLoading(false)
        }
    }

    const toggleAttendance = async () => {
        setLoading(true)
        try {
            await updateEvent(event.id, { is_attendance_enabled: !event.is_attendance_enabled })
            toast.success(`Attendance tracking ${!event.is_attendance_enabled ? 'enabled' : 'disabled'}`)
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update attendance settings')
        } finally {
            setLoading(false)
        }
    }

    const updateRegistrationType = async (type: 'free' | 'paid') => {
        if (type === event.registration_type) return
        if (isConfigLocked) {
            toast.error('Cannot change registration type after event has started')
            return
        }

        setLoading(true)
        try {
            await updateEvent(event.id, { registration_type: type })
            toast.success(`Event is now ${type}`)
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update registration type')
        } finally {
            setLoading(false)
        }
    }

    const handleUploadQR = async () => {
        if (!qrFile) return
        setIsUploadingQR(true)
        try {
            await uploadEventPaymentQR(event.id, qrFile)
            toast.success('Payment QR uploaded')
            setQrFile(null)
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to upload payment QR')
        } finally {
            setIsUploadingQR(false)
        }
    }

    const toggleRegistration = async () => {
        if (isConfigLocked && event.registration_status === 'opened') {
            // Allow closing registration even if locked, but maybe warn?
            // Actually, organizers should be able to close registration anytime.
            // But opening it after event ends is weird.
            // For now, allow it.
        }

        setLoading(true)
        try {
            if (event.registration_status === 'opened') {
                await closeRegistration(event.id)
                toast.success('Registration closed')
            } else {
                await openRegistration(event.id)
                toast.success('Registration opened')
            }
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update registration status')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await deleteEvent(event.id)
            toast.success('Event deleted')
            setShowDeleteModal(false)
            onDelete() // Use callback instead of router.push
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete event')
        } finally {
            setIsDeleting(false)
        }
    }

    // Check if user is organizer
    const isOrganizer = user?.user_id === event.organizer_id

    if (isOngoing) {
        return (
            <div className="space-y-12 animate-fadeIn max-w-6xl mx-auto">
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-2xl text-sm font-medium border border-yellow-100 flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Event is ongoing — only Registration Status and Payment QR are available.
                </div>

                {/* Registration Controls */}
                <section>
                    <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm flex items-center justify-between">
                        <div>
                            <h4 className="text-lg font-bold text-zinc-900 mb-1">
                                Registration Status
                            </h4>
                            <p className="text-zinc-500 text-sm font-medium">
                                {event.registration_status === 'opened'
                                    ? 'Participants are currently allowed to register.'
                                    : 'Registration is closed. No new participants can join.'}
                            </p>
                        </div>

                        <button
                            onClick={toggleRegistration}
                            disabled={loading}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 ${event.registration_status === 'opened' ? 'bg-green-500' : 'bg-zinc-200'
                                }`}
                        >
                            <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${event.registration_status === 'opened' ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </section>

                {/* Payment QR (only for paid events during event day) */}
                {event.registration_type === 'paid' && (
                    <section>
                        <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <h4 className="text-lg font-bold text-zinc-900 mb-1">Payment QR</h4>
                                    <p className="text-zinc-500 text-sm font-medium">Upload a bank transfer/DuitNow QR for paid events. Visible only to joined participants.</p>
                                    {event.payment_qr_url && (
                                        <div className="mt-4">
                                            <img src={event.payment_qr_url} alt="Payment QR" className="w-48 h-48 object-contain rounded-xl border border-zinc-200" />
                                        </div>
                                    )}
                                </div>
                                <div className="w-full max-w-sm">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setQrFile(e.target.files?.[0] || null)}
                                        className="block w-full text-sm text-zinc-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-zinc-900 hover:file:bg-yellow-300"
                                    />
                                    <button
                                        onClick={handleUploadQR}
                                        disabled={!qrFile || isUploadingQR}
                                        className="mt-3 px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50"
                                    >
                                        {isUploadingQR ? 'Uploading...' : 'Upload QR'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-12 animate-fadeIn max-w-6xl mx-auto">

            {isConfigLocked && (
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-2xl text-sm font-medium border border-yellow-100 flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Some settings are locked because the event has started or ended.
                </div>
            )}

            {/* Visibility Settings */}
            <section>
                <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-bold text-zinc-900 mb-1">
                            Visibility
                        </h4>
                        <p className="text-zinc-500 text-sm font-medium">
                            {event.visibility === 'public'
                                ? 'Your event is visible to everyone.'
                                : 'Only you can see this event.'}
                        </p>
                    </div>

                    <button
                        onClick={toggleVisibility}
                        disabled={loading}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 ${event.visibility === 'public' ? 'bg-yellow-400' : 'bg-zinc-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${event.visibility === 'public' ? 'translate-x-7' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </section>

            {/* Attendance Settings */}
            <section>
                <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-bold text-zinc-900 mb-1">
                            Attendance Tracking
                        </h4>
                        <p className="text-zinc-500 text-sm font-medium">
                            {event.is_attendance_enabled
                                ? 'Participants can check in to mark attendance.'
                                : 'Attendance tracking is disabled.'}
                        </p>
                        {event.registration_status === 'closed' && (
                            <p className="text-[12px] font-bold text-zinc-400 mt-1">
                                Registration is closed — attendance scanning is disabled.
                            </p>
                        )}
                    </div>

                    <button
                        onClick={toggleAttendance}
                        disabled={loading || event.registration_status === 'closed'}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 ${event.is_attendance_enabled ? 'bg-yellow-400' : 'bg-zinc-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${event.is_attendance_enabled ? 'translate-x-7' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </section>

            {/* Registration Type */}
            <section>
                <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-bold text-zinc-900 mb-1">
                            Registration Type
                        </h4>
                        <p className="text-zinc-500 text-sm font-medium">
                            Is this a free or paid event?
                        </p>
                    </div>

                    <div className="flex bg-zinc-100 rounded-xl p-1">
                        <button
                            onClick={() => updateRegistrationType('free')}
                            disabled={loading || isConfigLocked}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${event.registration_type === 'free'
                                ? 'bg-white text-zinc-900 shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-700'
                                } ${isConfigLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Free
                        </button>
                        <button
                            onClick={() => updateRegistrationType('paid')}
                            disabled={loading || isConfigLocked}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${event.registration_type === 'paid'
                                ? 'bg-white text-zinc-900 shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-700'
                                } ${isConfigLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Paid
                        </button>
                    </div>
                </div>
            </section>

            {/* Registration Controls */}
            <section>
                <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-bold text-zinc-900 mb-1">
                            Registration Status
                        </h4>
                        <p className="text-zinc-500 text-sm font-medium">
                            {event.registration_status === 'opened'
                                ? 'Participants are currently allowed to register.'
                                : 'Registration is closed. No new participants can join.'}
                        </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                        onClick={toggleRegistration}
                        disabled={loading}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 ${event.registration_status === 'opened' ? 'bg-green-500' : 'bg-zinc-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${event.registration_status === 'opened' ? 'translate-x-7' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </section>

            {event.registration_type === 'paid' && (
                <>
                    <section>
                        <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm flex items-center justify-between">
                            <div>
                                <h4 className="text-lg font-bold text-zinc-900 mb-1">
                                    Ticket Price
                                </h4>
                                <p className="text-zinc-500 text-sm font-medium">
                                    Set the price per participant.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    value={event.currency || 'MYR'}
                                    onChange={(e) => handleCurrencyChange(e.target.value)}
                                    disabled={loading || isConfigLocked}
                                    className="bg-zinc-100 border-none rounded-xl px-4 py-2 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-400 disabled:opacity-50 cursor-pointer"
                                >
                                    <option value="MYR">MYR</option>
                                    <option value="USD">USD</option>
                                    <option value="SGD">SGD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={localPrice}
                                        onChange={(e) => setLocalPrice(e.target.value)}
                                        onBlur={handlePriceBlur}
                                        disabled={loading || isConfigLocked}
                                        className="bg-zinc-100 border-none rounded-xl w-32 px-4 py-2 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <h4 className="text-lg font-bold text-zinc-900 mb-1">Payment QR</h4>
                                    <p className="text-zinc-500 text-sm font-medium">Upload a bank transfer/DuitNow QR for paid events. Visible only to joined participants.</p>
                                    {event.payment_qr_url && (
                                        <div className="mt-4">
                                            <img src={event.payment_qr_url} alt="Payment QR" className="w-48 h-48 object-contain rounded-xl border border-zinc-200" />
                                        </div>
                                    )}
                                </div>
                                <div className="w-full max-w-sm">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setQrFile(e.target.files?.[0] || null)}
                                        className="block w-full text-sm text-zinc-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-zinc-900 hover:file:bg-yellow-300"
                                    />
                                    <button
                                        onClick={handleUploadQR}
                                        disabled={!qrFile || isUploadingQR}
                                        className="mt-3 px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50"
                                    >
                                        {isUploadingQR ? 'Uploading...' : 'Upload QR'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {/* Danger Zone - Only visible to organizers */}
            {isOrganizer && (
                <section>
                    <div className="bg-red-50 rounded-[2rem] border border-red-100 p-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-lg font-bold text-red-900 mb-1">Delete Event</h4>
                                <p className="text-red-700/80 text-sm font-medium">
                                    Once deleted, this event cannot be restored.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                disabled={loading}
                                className="px-6 py-3 bg-white text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-50 transition-all shadow-sm"
                            >
                                Delete Event
                            </button>
                        </div>
                    </div>
                </section>
            )}

            <DeleteEventModal
                isOpen={showDeleteModal}
                eventTitle={event.title}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                isDeleting={isDeleting}
            />
        </div>
    )
}
