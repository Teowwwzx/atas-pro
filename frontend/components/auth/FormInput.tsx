'use client'

import React from 'react'

export function FormInput({
    label,
    id,
    type = 'text',
    placeholder,
    value,
    onChange,
    required,
}: {
    label: string
    id: string
    type?: string
    placeholder: string
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    required?: boolean
}) {
    return (
        <div className="group">
            <label htmlFor={id} className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                {label}
            </label>
            <input
                id={id}
                name={id}
                type={type}
                required={required}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="block w-full rounded-2xl bg-gray-100 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200 placeholder-gray-400"
            />
        </div>
    )
}