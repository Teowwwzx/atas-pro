"use client"

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ImagePreviewModalProps {
    isOpen: boolean
    imageUrl: string | null
    onClose: () => void
}

export function ImagePreviewModal({ isOpen, imageUrl, onClose }: ImagePreviewModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [isOpen, onClose])

    if (!isOpen || !imageUrl) return null

    // Portal to body to ensure it's on top of everything
    if (typeof window === 'undefined') return null

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            <div className="relative max-w-5xl max-h-[90vh] p-4 animate-scaleIn">
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors p-2"
                >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>,
        document.body
    )
}
