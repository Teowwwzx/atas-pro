'use client'

import React, { ReactNode } from 'react'

interface EmptyStateProps {
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
    icon?: ReactNode
}

export function EmptyState({
    title,
    description,
    actionLabel,
    onAction,
    icon,
}: EmptyStateProps) {
    return (
        <div className="text-center py-16 bg-white rounded-[2.5rem] shadow-sm border border-yellow-100 flex flex-col items-center justify-center">
            <div className="mx-auto h-24 w-24 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                {icon ? (
                    icon
                ) : (
                    <svg
                        className="h-12 w-12 text-yellow-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                    </svg>
                )}
            </div>
            <h3 className="mt-2 text-xl font-bold text-zinc-900">{title}</h3>
            <p className="mt-1 text-zinc-500 max-w-sm mx-auto px-4">
                {description}
            </p>
            {actionLabel && onAction && (
                <div className="mt-8">
                    <button
                        onClick={onAction}
                        className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-bold rounded-full text-zinc-900 bg-yellow-400 hover:bg-yellow-300 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                    >
                        {actionLabel}
                    </button>
                </div>
            )}
        </div>
    )
}
