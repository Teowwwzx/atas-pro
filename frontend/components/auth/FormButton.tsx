'use client'

import React from 'react'

interface FormButtonProps {
    children: React.ReactNode
    disabled?: boolean
    onClick?: () => void
}

export function FormButton({ children, disabled, onClick }: FormButtonProps) {
    return (
        <button
            type="submit"
            disabled={disabled}
            onClick={onClick}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-lg text-base font-bold text-zinc-900 bg-yellow-400 hover:bg-yellow-300 hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
        >
            {children}
        </button>
    )
}