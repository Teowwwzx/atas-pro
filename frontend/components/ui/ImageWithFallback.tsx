'use client'

import React, { useState, useEffect } from 'react'
import Image, { ImageProps } from 'next/image'

interface ImageWithFallbackProps extends ImageProps {
    fallbackSrc?: string
}

export function ImageWithFallback({ src, fallbackSrc, alt, ...props }: ImageWithFallbackProps) {
    const [error, setError] = useState(false)
    const [imgSrc, setImgSrc] = useState(src)

    useEffect(() => {
        setImgSrc(src)
        setError(false)
    }, [src])

    const handleError = () => {
        setError(true)
        if (fallbackSrc) {
            setImgSrc(fallbackSrc)
        } else {
            // Default fallback if none provided
            setImgSrc(`https://placehold.co/600x400/png?text=${encodeURIComponent(alt || 'Image')}`)
        }
    }

    return (
        <Image
            {...props}
            alt={alt}
            src={imgSrc || `https://placehold.co/600x400/png?text=${encodeURIComponent(alt || 'Image')}`}
            onError={handleError}
            // Ensure we can handle external URLs that might not be in next.config.js by using unoptimized if needed, 
            // but usually next/image handles configured domains. 
            // If the fallback is placehold.co, it should be in next.config.js.
        />
    )
}
