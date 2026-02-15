'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'react-hot-toast'
import { createCategory, updateCategory } from '@/services/api'
import type { CategoryResponse } from '@/services/api.types'

interface CreateCategoryModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    editingCategory?: CategoryResponse | null
}

export function CreateCategoryModal({ isOpen, onClose, onSuccess, editingCategory }: CreateCategoryModalProps) {
    const [name, setName] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (editingCategory) {
            setName(editingCategory.name)
        } else {
            setName('')
        }
    }, [editingCategory, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            toast.error('Category name is required')
            return
        }

        setIsLoading(true)
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, { name: name.trim() })
                toast.success('Category updated')
            } else {
                await createCategory({ name: name.trim() })
                toast.success('Category created')
            }
            onSuccess()
            setName('')
            onClose()
        } catch (e: any) {
            // Display backend error message if available, otherwise show generic message
            const errorMessage = e?.response?.data?.detail || (editingCategory ? 'Failed to update category' : 'Failed to create category')
            toast.error(errorMessage)
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 max-w-md w-full outline-none">
                    <Dialog.Title className="text-xl font-bold text-gray-900 mb-4 tracking-tight">
                        {editingCategory ? 'Edit Category' : 'Create Category'}
                    </Dialog.Title>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Category Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="text-gray-900 w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                                placeholder="e.g., Machine Learning"
                                required
                                autoFocus
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Will be displayed as capitalized text (e.g., "Machine Learning")
                            </p>
                        </div>
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
                                disabled={isLoading}
                                className="px-4 py-2 bg-yellow-400 text-zinc-900 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 font-bold shadow-sm"
                            >
                                {isLoading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
