'use client'

import React from 'react'
import { enableDashboardPro } from '@/services/api'
import { toast } from 'react-hot-toast'

interface DashboardProModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function DashboardProModal({ isOpen, onClose, onSuccess }: DashboardProModalProps) {
    const [isEnabling, setIsEnabling] = React.useState(false)

    if (!isOpen) return null

    const handleEnable = async () => {
        setIsEnabling(true)
        try {
            await enableDashboardPro()
            toast.success('Dashboard Pro enabled!')
            onSuccess()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error('Failed to enable Dashboard Pro')
        } finally {
            setIsEnabling(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-[2.5rem] p-8 max-w-lg w-full mx-4 shadow-2xl animate-fadeIn">
                {/* Yellow accent */}
                <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400 rounded-l-[2.5rem]" />

                <div className="pl-6 space-y-6">
                    {/* Icon */}
                    <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl font-black text-zinc-900">
                        Unlock Dashboard Pro
                    </h2>

                    {/* Description */}
                    <p className="text-zinc-600 font-medium text-lg leading-relaxed">
                        Dashboard Pro is for users managing multiple events with professional
                        tools. Organize as many events as you need with advanced features.
                    </p>

                    {/* Features */}
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-zinc-700 font-medium">Create unlimited events</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-zinc-700 font-medium">Multi-event grid dashboard</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-zinc-700 font-medium">Professional event management</span>
                        </li>
                    </ul>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            disabled={isEnabling}
                            className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
                        >
                            Maybe Later
                        </button>
                        <button
                            onClick={handleEnable}
                            disabled={isEnabling}
                            className="flex-1 px-6 py-3 bg-zinc-900 text-yellow-400 font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isEnabling ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Enabling...
                                </>
                            ) : (
                                <>
                                    Enable Pro
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
