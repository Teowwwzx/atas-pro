"use client"

import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
    src?: string | null
    alt?: string
    fallback?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

export function Avatar({ src, alt, fallback, size = 'md', className }: AvatarProps) {

    const sizeClasses = {
        sm: "h-8 w-8 text-xs",
        md: "h-9 w-9 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-20 w-20 text-xl"
    }

    const [imgError, setImgError] = React.useState(false)

    // Derived fallback logic: 
    // 1. If props.fallback provided, use it.
    // 2. Else if alt provided, use first char.
    // 3. Else use '?'
    const fallbackText = fallback || (alt ? alt.charAt(0).toUpperCase() : '?')

    // Handle legacy ui-avatars.com URLs from database
    let finalSrc = src
    if (src?.includes('ui-avatars.com')) {
        try {
            const url = new URL(src)
            const name = url.searchParams.get('name') || alt || 'Avatar'
            finalSrc = `https://placehold.co/200x200/png?text=${encodeURIComponent(name)}`
        } catch {
            finalSrc = null
        }
    }

    return (
        <div
            className={cn(
                "relative rounded-full overflow-hidden flex items-center justify-center bg-yellow-100 text-yellow-700 font-bold ring-2 ring-white shrink-0",
                sizeClasses[size],
                className
            )}
        >
            {finalSrc && !imgError ? (
                <Image
                    src={finalSrc}
                    alt={alt || "Avatar"}
                    fill
                    className="object-cover"
                    onError={() => setImgError(true)}
                    // Optimization: Avatars are usually small, so we don't need huge intrinsic sizes
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            ) : (
                <span>{fallbackText}</span>
            )}
        </div>
    )
}
