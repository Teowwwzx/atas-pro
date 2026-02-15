'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { toast } from 'react-hot-toast'
import { createCategory } from '@/services/api'

interface BatchCreateCategoriesModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function BatchCreateCategoriesModal({ isOpen, onClose, onSuccess }: BatchCreateCategoriesModalProps) {
    const [categoriesText, setCategoriesText] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const categories = categoriesText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (categories.length === 0) {
            toast.error('Please enter at least one category name')
            return
        }

        setIsLoading(true)
        let successCount = 0
        let failedCategories: string[] = []

        try {
            // Create categories one by one
            for (const categoryName of categories) {
                try {
                    await createCategory({ name: categoryName })
                    successCount++
                } catch (e: any) {
                    const errorMsg = e?.response?.data?.detail || ''
                    // Only track as failed if it's not  duplicate
                    if (errorMsg.includes('already exists')) {
                        // Skip duplicates silently or count as partial success
                        successCount++
                    } else {
                        failedCategories.push(categoryName)
                    }
                }
            }

            if (successCount > 0) {
                toast.success(`Created ${successCount} ${successCount === 1 ? 'category' : 'categories'}`)
            }

            if (failedCategories.length > 0) {
                toast.error(`Failed to create: ${failedCategories.join(', ')}`)
            }

            if (successCount === categories.length) {
                onSuccess()
                onClose()
                setCategoriesText('')
            } else if (successCount > 0) {
                onSuccess() // Refresh the list even if some failed
            }
        } catch (error) {
            toast.error('Failed to create categories')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 max-w-lg w-full outline-none">
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-xl font-bold text-gray-900 tracking-tight">
                            Batch Create Categories
                        </Dialog.Title>
                        <Dialog.Close className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Cross2Icon className="w-5 h-5 text-gray-500" />
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Category Names (one per line)
                            </label>
                            <textarea
                                value={categoriesText}
                                onChange={(e) => setCategoriesText(e.target.value)}
                                className="text-gray-900 w-full h-48 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none resize-none font-mono text-sm"
                                placeholder="Artificial Intelligence&#10;Machine Learning&#10;Data Science&#10;Cloud Computing"
                                required
                                autoFocus
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Enter one category name per line. Duplicates will be skipped automatically.
                            </p>
                        </div>

                        {categories.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm font-medium text-blue-900 mb-1">
                                    Preview ({categories.length} {categories.length === 1 ? 'category' : 'categories'})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {categories.slice(0, 10).map((cat, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-white border border-blue-300 rounded text-xs font-medium text-blue-700">
                                            {cat}
                                        </span>
                                    ))}
                                    {categories.length > 10 && (
                                        <span className="px-2 py-1 text-xs text-blue-600">
                                            +{categories.length - 10} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || categories.length === 0}
                                className="px-5 py-2 bg-yellow-400 text-zinc-900 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 font-bold shadow-sm"
                            >
                                {isLoading ? `Creating ${categories.length}...` : `Create ${categories.length} ${categories.length === 1 ? 'Category' : 'Categories'}`}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
