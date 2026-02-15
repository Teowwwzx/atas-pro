import React, { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { toast } from 'react-hot-toast'
import { EventProposalResponse, EventProposalCreate, EventChecklistItemResponse } from '@/services/api.types'
import { getEventProposals, createEventProposalWithFile, deleteEventProposal, getEventChecklist } from '@/services/api'

interface ProposalManagerModalProps {
    isOpen: boolean
    onClose: () => void
    eventId: string
    onSelectProposal: (proposal: EventProposalResponse) => void
    selectedProposalId?: string
}

export function ProposalManagerModal({ isOpen, onClose, eventId, onSelectProposal, selectedProposalId }: ProposalManagerModalProps) {
    const [proposals, setProposals] = useState<EventProposalResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'list' | 'upload'>('list')
    const [checklistItems, setChecklistItems] = useState<EventChecklistItemResponse[]>([])

    // Upload State
    const [uploadForm, setUploadForm] = useState<EventProposalCreate & { file: File | null; linkedChecklistIds: string[] }>({
        title: '',
        description: '',
        file_url: '',
        file: null,
        linkedChecklistIds: []
    })
    const [uploading, setUploading] = useState(false)

    // Local Storage Key for Links (Preserving existing logic)
    const LINK_STORAGE_KEY = `event_${eventId}_file_checklist_links`

    useEffect(() => {
        if (isOpen) {
            fetchProposals()
            fetchChecklist()
        }
    }, [isOpen, eventId])

    const fetchProposals = async () => {
        setLoading(true)
        try {
            const data = await getEventProposals(eventId)
            setProposals(data)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load proposals')
        } finally {
            setLoading(false)
        }
    }

    const fetchChecklist = async () => {
        try {
            const data = await getEventChecklist(eventId)
            setChecklistItems(data.sort((a, b) => a.sort_order - b.sort_order))
        } catch (error) {
            console.error(error)
        }
    }

    const saveLinks = (proposalId: string, checklistIds: string[]) => {
        try {
            const stored = localStorage.getItem(LINK_STORAGE_KEY)
            const links: Record<string, string[]> = stored ? JSON.parse(stored) : {}
            links[proposalId] = checklistIds
            localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify(links))
        } catch (e) {
            console.error('Failed to save file links:', e)
        }
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!uploadForm.title || !uploadForm.file) {
            toast.error('Please provide a title and a file')
            return
        }

        setUploading(true)
        try {
            const newProposal = await createEventProposalWithFile(eventId, {
                title: uploadForm.title,
                description: uploadForm.description
            }, uploadForm.file)

            if (uploadForm.linkedChecklistIds.length > 0) {
                saveLinks(newProposal.id, uploadForm.linkedChecklistIds)
            }

            toast.success('Proposal uploaded!')
            setUploadForm({ title: '', description: '', file_url: '', file: null, linkedChecklistIds: [] })
            setView('list')
            fetchProposals()
        } catch (error) {
            console.error(error)
            toast.error('Failed to upload proposal')
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent selection when deleting
        if (!confirm('Are you sure you want to delete this proposal?')) return

        try {
            await deleteEventProposal(eventId, id)
            setProposals(proposals.filter(p => p.id !== id))
            toast.success('Proposal deleted')
            if (selectedProposalId === id) {
                // If we deleted the selected one, maybe notify parent? 
                // For now, parent might still hold the ID, but that's a minor edge case.
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete proposal')
        }
    }

    const filteredChecklist = checklistItems

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all border border-zinc-100">
                                {/* Header */}
                                <div className="flex items-center justify-between p-6 border-b border-zinc-100">
                                    <div>
                                        <Dialog.Title as="h3" className="text-xl font-black text-zinc-900">
                                            Attach Proposal
                                        </Dialog.Title>
                                        <p className="text-sm text-zinc-500 mt-1">
                                            Select an existing proposal or upload a new one
                                        </p>
                                    </div>
                                    <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Tab Navigation */}
                                <div className="flex border-b border-zinc-200 px-6">
                                    <button
                                        onClick={() => setView('list')}
                                        className={`px-6 py-3 font-bold text-sm transition-all relative ${view === 'list'
                                                ? 'text-zinc-900'
                                                : 'text-zinc-400 hover:text-zinc-600'
                                            }`}
                                    >
                                        Select Existing
                                        {view === 'list' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setView('upload')}
                                        className={`px-6 py-3 font-bold text-sm transition-all relative ${view === 'upload'
                                                ? 'text-zinc-900'
                                                : 'text-zinc-400 hover:text-zinc-600'
                                            }`}
                                    >
                                        Upload New
                                        {view === 'upload' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400" />
                                        )}
                                    </button>
                                </div>

                                {/* Content Area */}
                                <div className="p-6 max-h-[500px] overflow-y-auto">
                                    {view === 'list' ? (
                                        <div className="space-y-3">
                                            {loading ? (
                                                <div className="flex justify-center py-10">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                                                </div>
                                            ) : proposals.length === 0 ? (
                                                <div className="text-center py-12 px-4">
                                                    <div className="w-16 h-16 bg-zinc-50 border border-zinc-200 text-zinc-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    </div>
                                                    <h4 className="text-zinc-900 font-bold mb-1">No proposals yet</h4>
                                                    <p className="text-zinc-500 text-sm mb-4">Get started by uploading your first proposal.</p>
                                                    <button
                                                        onClick={() => setView('upload')}
                                                        className="px-4 py-2 bg-zinc-900 text-yellow-400 font-bold rounded-xl text-sm hover:bg-zinc-800 transition-all"
                                                    >
                                                        Upload Now
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {proposals.map(proposal => (
                                                        <div
                                                            key={proposal.id}
                                                            onClick={() => {
                                                                onSelectProposal(proposal)
                                                                onClose()
                                                            }}
                                                            className={`group p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-4 ${selectedProposalId === proposal.id
                                                                    ? 'bg-yellow-50 border-yellow-400 shadow-sm ring-1 ring-yellow-400'
                                                                    : 'bg-white border-zinc-200 hover:border-yellow-400 hover:shadow-md'
                                                                }`}
                                                        >
                                                            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-bold text-zinc-900 truncate">{proposal.title}</h4>
                                                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                                    <span>PDF</span>
                                                                    <span>•</span>
                                                                    <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={(e) => handleDelete(proposal.id, e)}
                                                                className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                title="Delete Proposal"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                            {selectedProposalId === proposal.id && (
                                                                <div className="w-6 h-6 rounded-full bg-yellow-400 text-white flex items-center justify-center shadow-sm">
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <form onSubmit={handleUpload} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-bold text-zinc-700 mb-1">Proposal Title</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={uploadForm.title || ''}
                                                    onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                                                    className="text-gray-700 w-full px-4 py-2 border border-zinc-200 rounded-xl focus:border-yellow-400 focus:ring-yellow-400 outline-none transition-all"
                                                    placeholder="e.g. Sponsorship Package 2024"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-zinc-700 mb-1">Description (Optional)</label>
                                                <textarea
                                                    value={uploadForm.description || ''}
                                                    onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                                                    className="text-gray-700 w-full px-4 py-2 border border-zinc-200 rounded-xl focus:border-yellow-400 focus:ring-yellow-400 outline-none transition-all resize-none h-24"
                                                    placeholder="Brief description of this proposal..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-zinc-700 mb-1">File (PDF/Doc)</label>
                                                <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center hover:bg-zinc-50 transition-all cursor-pointer relative">
                                                    <input
                                                        type="file"
                                                        required
                                                        onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                                                        className="text-gray-700 absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        accept=".pdf,.doc,.docx"
                                                    />
                                                    <div className="pointer-events-none">
                                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                        </div>
                                                        <p className="text-sm font-bold text-zinc-900">
                                                            {uploadForm.file ? uploadForm.file.name : 'Click to upload or drag file here'}
                                                        </p>
                                                        <p className="text-xs text-zinc-400 mt-1">PDF, DOC up to 10MB</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-zinc-700 mb-2">Link to Checklist (Optional)</label>
                                                <div className="bg-zinc-50 rounded-xl border border-zinc-200 max-h-32 overflow-y-auto p-2 space-y-1">
                                                    {checklistItems.length === 0 ? (
                                                        <p className="text-xs text-zinc-400 text-center py-3">No checklist items found</p>
                                                    ) : (
                                                        checklistItems.map(item => (
                                                            <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 text-yellow-500 rounded border-zinc-300 focus:ring-yellow-400"
                                                                    checked={uploadForm.linkedChecklistIds.includes(item.id)}
                                                                    onChange={e => {
                                                                        if (e.target.checked) {
                                                                            setUploadForm(prev => ({ ...prev, linkedChecklistIds: [...prev.linkedChecklistIds, item.id] }))
                                                                        } else {
                                                                            setUploadForm(prev => ({ ...prev, linkedChecklistIds: prev.linkedChecklistIds.filter(id => id !== item.id) }))
                                                                        }
                                                                    }}
                                                                />
                                                                <span className="text-sm text-zinc-700">{item.title}</span>
                                                            </label>
                                                        ))
                                                    )}
                                                </div>
                                                <p className="text-xs text-zinc-400 mt-1 pl-1">Selected checklist items will be linked to this proposal.</p>
                                            </div>

                                            <div className="pt-2 flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={onClose}
                                                    className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={uploading}
                                                    className="flex-1 py-3 bg-zinc-900 text-yellow-400 font-bold rounded-xl shadow-lg hover:bg-zinc-800 transition-all disabled:opacity-50"
                                                >
                                                    {uploading ? 'Uploading...' : 'Upload & Attach'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
