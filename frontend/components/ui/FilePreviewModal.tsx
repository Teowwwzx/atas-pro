"use client"

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface FilePreviewModalProps {
    isOpen: boolean
    fileUrl: string | null
    fileName?: string
    onClose: () => void
}

export function FilePreviewModal({ isOpen, fileUrl, fileName, onClose }: FilePreviewModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [isOpen, onClose])

    if (!isOpen || !fileUrl) return null

    if (typeof window === 'undefined') return null

    const isImage = fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn p-4 md:p-8"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-6xl h-full md:h-[90vh] flex flex-col bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
                    <h3 className="text-white font-bold truncate max-w-lg">{fileName || 'File Preview'}</h3>
                    <div className="flex items-center gap-4">
                        <a 
                            href={fileUrl} 
                            download 
                            className="text-zinc-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                        </a>
                        <button
                            onClick={onClose}
                            className="text-zinc-400 hover:text-white transition-colors"
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden relative">
                    {isImage ? (
                        <img
                            src={fileUrl}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : (
                        <iframe
                            src={fileUrl}
                            className="w-full h-full border-0"
                            title="File Preview"
                        />
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
