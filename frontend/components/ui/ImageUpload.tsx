'use client'

import React, { useRef } from 'react'
import { toast } from 'react-hot-toast'
import { Cross2Icon, UploadIcon } from '@radix-ui/react-icons'

interface ImageUploadProps {
    value?: string | null
    onChange: (url: string | null) => void
    placeholder?: string
    helpText?: string
    maxSizeMB?: number
}

export function ImageUpload({
    value,
    onChange,
    placeholder = 'Upload image',
    helpText,
    maxSizeMB = 5
}: ImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = error => reject(error)
        })
    }

    const validateFile = (file: File): string | null => {
        if (!file.type.startsWith('image/')) {
            return 'Please upload an image file'
        }

        const sizeMB = file.size / (1024 * 1024)
        if (sizeMB > maxSizeMB) {
            return `File size must be less than ${maxSizeMB}MB`
        }

        const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!validFormats.includes(file.type)) {
            return 'Only JPG, PNG, and WebP formats are supported'
        }

        return null
    }

    const handleFileChange = async (file: File) => {
        const error = validateFile(file)
        if (error) {
            toast.error(error)
            return
        }

        try {
            const base64 = await convertToBase64(file)
            onChange(base64)
            toast.success('Image uploaded successfully')
        } catch (err) {
            console.error('Upload error:', err)
            toast.error('Failed to upload image')
        }
    }

    const handleRemove = () => {
        onChange(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Extract filename from base64 or show generic name
    const getFileName = () => {
        if (!value) return null
        // If it's a base64 string, show generic name
        if (value.startsWith('data:')) {
            return 'Uploaded image'
        }
        // If it's a URL, extract filename
        return value.split('/').pop() || 'Uploaded image'
    }

    return (
        <div>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                    <UploadIcon className="w-4 h-4" />
                    {placeholder}
                </button>

                {value && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-sm text-gray-700 font-medium truncate max-w-xs">
                            {getFileName()}
                        </span>
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Remove image"
                        >
                            <Cross2Icon className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileChange(file)
                    }}
                    className="hidden"
                />
            </div>

            {helpText && (
                <p className="text-xs text-gray-500 mt-2 ml-1">{helpText}</p>
            )}
        </div>
    )
}
