"use client"

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ResourcePreviewModalProps {
    isOpen: boolean
    resource: {
        title: string
        url: string
        type?: 'image' | 'pdf' | 'doc' | 'sheet' | 'slide' | 'generic'
    } | null
    onClose: () => void
}

export function ResourcePreviewModal({ isOpen, resource, onClose }: ResourcePreviewModalProps) {
    const [iframeUrl, setIframeUrl] = useState<string | null>(null)

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [isOpen, onClose])

    useEffect(() => {
        if (!resource?.url) {
            setIframeUrl(null)
            return
        }

        let url = resource.url
        // Convert Google Docs/Sheets/Slides edit URLs to preview/embed URLs
        if (url.includes('docs.google.com')) {
            // Replace /edit... with /preview or /embed depending on type
            // /preview works well for Docs/Sheets/Slides generally
            if (url.includes('/edit')) {
                url = url.replace(/\/edit.*/, '/preview')
            } else if (!url.includes('/preview') && !url.includes('/embed')) {
                // If it ends with just the ID, append /preview
                if (url.endsWith('/')) url += 'preview'
                else url += '/preview'
            }
        }
        setIframeUrl(url)
    }, [resource])

    if (!isOpen || !resource) return null
    if (typeof window === 'undefined') return null

    const isImage = resource.type === 'image' || resource.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null

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
                    <div className="flex flex-col">
                        <h3 className="text-white font-bold truncate max-w-lg">{resource.title}</h3>
                        <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 truncate max-w-md"
                        >
                            {resource.url}
                        </a>
                    </div>
                    <div className="flex items-center gap-4">
                        <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open in New Tab
                        </a>
                        <button
                            onClick={onClose}
                            className="text-zinc-400 hover:text-white transition-colors p-1"
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
                            src={resource.url}
                            alt={resource.title}
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : (
                        <iframe
                            src={iframeUrl || resource.url}
                            className="w-full h-full border-0"
                            title="Resource Preview"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
