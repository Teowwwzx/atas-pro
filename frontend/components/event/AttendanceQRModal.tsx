'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { generateMyQR, fetchMyQRImageBlob } from '@/services/api'
import { AttendanceQRResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'

interface AttendanceQRModalProps {
    eventId: string
    eventTitle: string
    eventEndTime: string // ISO datetime when event ends
    isOpen: boolean
    onClose: () => void
}

export function AttendanceQRModal({ eventId, eventTitle, eventEndTime, isOpen, onClose }: AttendanceQRModalProps) {
    const [qrData, setQrData] = useState<AttendanceQRResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [expiresIn, setExpiresIn] = useState<string>('')
    const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
    const [isEnlarged, setIsEnlarged] = useState(false)

    useEffect(() => {
        if (isOpen && !qrData) {
            fetchQR()
        }
    }, [isOpen])

    useEffect(() => {
        if (!qrData) return

        const interval = setInterval(() => {
            const now = new Date().getTime()
            const eventEnd = new Date(eventEndTime).getTime()
            const qrExpiry = new Date(qrData.expires_at).getTime()

            // Use the later of QR expiry or event end time
            const effectiveExpiry = Math.max(qrExpiry, eventEnd)
            const diff = effectiveExpiry - now

            if (diff <= 0) {
                setExpiresIn('Event ended')
                clearInterval(interval)
            } else {
                // Show time until event ends
                const hours = Math.floor(diff / 3600000)
                const mins = Math.floor((diff % 3600000) / 60000)

                if (hours > 0) {
                    setExpiresIn(`Valid for ${hours}h ${mins}m`)
                } else if (mins > 0) {
                    setExpiresIn(`Valid for ${mins}m`)
                } else {
                    const secs = Math.floor((diff % 60000) / 1000)
                    setExpiresIn(`${secs}s left`)
                }
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [qrData, eventEndTime])

    const fetchQR = async () => {
        setLoading(true)
        try {
            const data = await generateMyQR(eventId)
            setQrData(data)
            try {
                const blob = await fetchMyQRImageBlob(eventId, 60)
                const url = URL.createObjectURL(blob)
                setQrImageUrl(url)
            } catch (e) {
                console.error('Failed to fetch QR image blob', e)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to generate QR code')
        } finally {
            setLoading(false)
        }
    }

    const downloadQR = () => {
        const src = qrImageUrl
        if (!src) return
        const downloadLink = document.createElement('a')
        downloadLink.download = `attendance-qr-${eventTitle}.png`
        downloadLink.href = src
        downloadLink.click()
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[2rem] bg-white shadow-xl transition-all">
                                {/* Header */}
                                <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50">
                                    <div>
                                        <h3 className="text-xl font-black text-zinc-900">Attendance QR</h3>
                                        <p className="text-sm text-zinc-500 mt-1">{eventTitle}</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 p-2 hover:bg-white/50 rounded-full transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-8 flex flex-col items-center">
                                    {loading ? (
                                        <div className="flex flex-col items-center gap-4 py-12">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                            <p className="text-sm text-zinc-500">Generating QR code...</p>
                                        </div>
                                    ) : qrData ? (
                                        <>
                                            {/* QR Code */}
                                            <div 
                                                id="attendance-qr" 
                                                className="bg-white p-6 rounded-2xl shadow-lg border-4 border-blue-100 mb-6 cursor-zoom-in transition-transform active:scale-95"
                                                onClick={() => qrImageUrl && setIsEnlarged(true)}
                                            >
                                                {qrImageUrl ? (
                                                    <img src={qrImageUrl} alt="Attendance QR" width={240} height={240} className="mx-auto" />
                                                ) : (
                                                    <div className="w-[240px] h-[240px] flex items-center justify-center text-zinc-500 mx-auto">QR unavailable</div>
                                                )}
                                                <p className="text-xs text-center mt-2 text-blue-400 font-bold uppercase tracking-wider">Tap to enlarge</p>
                                            </div>

                                            {/* Expiration Info */}
                                            <div className={`rounded-xl p-4 w-full mb-4 border-2 ${expiresIn === 'Event ended'
                                                ? 'bg-red-50 border-red-200'
                                                : 'bg-green-50 border-green-200'
                                                }`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <svg
                                                            className={`w-5 h-5 ${expiresIn === 'Event ended' ? 'text-red-600' : 'text-green-600'}`}
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className="font-bold text-zinc-900">
                                                            {expiresIn === 'Event ended' ? 'Status:' : 'Valid:'}
                                                        </span>
                                                    </div>
                                                    <span className={`font-black text-lg ${expiresIn === 'Event ended' ? 'text-red-600' : 'text-green-600'
                                                        }`}>
                                                        {expiresIn}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Instructions */}
                                            <div className="bg-zinc-50 rounded-xl p-4 w-full space-y-2 border-2 border-zinc-200">
                                                <p className="text-sm font-black text-zinc-900 mb-2 uppercase tracking-wider">How to use:</p>
                                                <div className="flex gap-2 text-sm text-zinc-900">
                                                    <span className="text-blue-600 font-black">1.</span>
                                                    <p className="font-medium">Keep this QR code ready when arriving at the event</p>
                                                </div>
                                                <div className="flex gap-2 text-sm text-zinc-900">
                                                    <span className="text-blue-600 font-black">2.</span>
                                                    <p className="font-medium">Show it to the organizer for scanning</p>
                                                </div>
                                                <div className="flex gap-2 text-sm text-zinc-900">
                                                    <span className="text-blue-600 font-black">3.</span>
                                                    <p className="font-medium">Your attendance will be marked automatically</p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-3 w-full mt-6">
                                                <button
                                                    onClick={downloadQR}
                                                    className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-colors text-sm flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    Download
                                                </button>
                                                <button
                                                    onClick={fetchQR}
                                                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    Refresh
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-zinc-500">Failed to load QR code</p>
                                            <button
                                                onClick={fetchQR}
                                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                Try Again
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>

            {/* Enlarged View */}
            <Transition appear show={isEnlarged} as={Fragment}>
                <Dialog as="div" className="relative z-[60]" onClose={() => setIsEnlarged(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center" onClick={() => setIsEnlarged(false)}>
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all">
                                    {qrImageUrl && (
                                        <img 
                                            src={qrImageUrl} 
                                            alt="Enlarged QR" 
                                            className="w-full h-auto aspect-square object-contain"
                                        />
                                    )}
                                    <p className="text-center mt-6 text-zinc-500 font-bold uppercase tracking-widest text-sm">Tap anywhere to close</p>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </Transition>
    )
}
