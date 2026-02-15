import React, { useState, useEffect } from 'react'
import { EventDetails, EventChecklistItemResponse, ProfileResponse, EventProposalResponse, EventParticipantRole, EventParticipantDetails } from '@/services/api.types'
import { getEventChecklist, createEventChecklistItem, updateEventChecklistItem, deleteEventChecklistItem, findProfiles, getEventProposals, getEventParticipants, getProfileByUserId, createEventProposalWithFile } from '@/services/api'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import { Dialog, Transition, Menu } from '@headlessui/react'
import { Fragment } from 'react'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'

interface TemplateTask {
    title: string
    description?: string
    priority?: 'low' | 'medium' | 'high'
    due_offset_days?: number
    assigned_role?: string
    link_url?: string
    visibility?: 'internal' | 'external'
}

const TEMPLATES: Record<string, { id: string, name: string, description: string, tasks: (string | TemplateTask)[] }> = {
    default: {
        id: 'default',
        name: "Default",
        description: "Essential tasks for any event.",
        tasks: [
            { title: "Pre-event" },
            { title: "Execution" },
            { title: "Post-event" }
        ]
    },
    event_prep: {
        id: 'event_prep',
        name: "Event Day Prep",
        description: "Standard preparation items for participants & guests.",
        tasks: [
            { title: "Logistics & Parking", description: "Arrangements for experts & guests", visibility: "external" },
            { title: "Guest Communication", description: "Send guides, maps, and reminders", visibility: "external" },
            { title: "Emergency Prep", description: "Contact info and safety protocols", visibility: "internal" }
        ]
    },
    project_management: {
        id: 'project_management',
        name: "Project Management",
        description: "Detailed setup for structured project tracking.",
        tasks: [
            { title: "Project Charter & Plan", assigned_role: "organizer" },
            { title: "Budget & Resources", link_url: "https://docs.google.com/spreadsheets/u/0/create" },
            { title: "Risk Management", assigned_role: "committee" },
            { title: "Execution Tracking" },
            { title: "Closing & Reporting" }
        ]
    },
    coming_soon: {
        id: 'coming_soon',
        name: "Coming Soon",
        description: "More templates are on the way!",
        tasks: []
    }
}

interface DashboardTabChecklistProps {
    event: EventDetails
}

export function DashboardTabChecklist({ event }: DashboardTabChecklistProps) {
    const [items, setItems] = useState<EventChecklistItemResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [files, setFiles] = useState<EventProposalResponse[]>([])
    const [viewVisibility, setViewVisibility] = useState<'all' | 'internal' | 'external'>('all')

    // Templates State
    const [showTemplateModal, setShowTemplateModal] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TEMPLATES>('default')

    // Assignment State
    const [committee, setCommittee] = useState<ProfileResponse[]>([])
    const [participants, setParticipants] = useState<EventParticipantDetails[]>([])

    // Inline Add State
    const [newItemTitle, setNewItemTitle] = useState('')
    const [newItemUser, setNewItemUser] = useState<ProfileResponse | null>(null)
    const [newItemFile, setNewItemFile] = useState<EventProposalResponse | null>(null) // New: Link a file
    const [newItemLinkUrl, setNewItemLinkUrl] = useState('')
    const [newVisibility, setNewVisibility] = useState<'internal' | 'external'>('internal')
    const [newAudienceRole, setNewAudienceRole] = useState<EventParticipantRole | null>(null)
    const [userSearch, setUserSearch] = useState('')
    const [showAssignMenu, setShowAssignMenu] = useState(false)
    const [showAttachMenu, setShowAttachMenu] = useState(false)

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const [editLinkItemId, setEditLinkItemId] = useState<string | null>(null)
    const [editLinkValue, setEditLinkValue] = useState('')

    // File Upload State
    const [uploadItemId, setUploadItemId] = useState<string | null>(null)
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [uploadTitle, setUploadTitle] = useState('')
    const [uploadDescription, setUploadDescription] = useState('')
    const [uploading, setUploading] = useState(false)

    // Preview Public Modal
    const [showPreviewModal, setShowPreviewModal] = useState(false)

    const fetchChecklist = async () => {
        try {
            const [checklistData, filesData, participantsData] = await Promise.all([
                getEventChecklist(event.id),
                getEventProposals(event.id),
                getEventParticipants(event.id)
            ])
            setItems(checklistData.sort((a, b) => a.sort_order - b.sort_order))
            setFiles(filesData)
            setParticipants(participantsData)

            // Fetch Committee Profiles
            const committeeIds = participantsData
                .filter(p => ['organizer', 'committee', 'speaker', 'sponsor'].includes(p.role))
                .map(p => p.user_id)
                .filter((id): id is string => !!id)

            // Unique IDs
            const uniqueIds = Array.from(new Set(committeeIds))

            const profiles = await Promise.all(uniqueIds.map(id => getProfileByUserId(id)))
            setCommittee(profiles)


        } catch (error) {
            console.error(error)
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    // Removed searchUsers as we now use committee list primarily, but can keep for fallback if needed.
    // For now, we will just use the committee list.

    useEffect(() => {
        fetchChecklist()
    }, [event.id])

    const getLinkType = (url: string) => {
        try {
            const u = new URL(url)
            const host = u.hostname
            const path = u.pathname.toLowerCase()
            const ext = (path.split('.').pop() || '').toLowerCase()
            if (ext === 'pdf') return 'pdf'
            if (['doc', 'docx'].includes(ext)) return 'doc'
            if (['xls', 'xlsx'].includes(ext)) return 'sheet'
            if (['ppt', 'pptx'].includes(ext)) return 'ppt'
            if (path.match(/\.(jpeg|jpg|gif|png|webp)$/)) return 'image'
            if (host.includes('docs.google.com')) {
                if (path.includes('/spreadsheets/')) return 'sheet'
                if (path.includes('/presentation/')) return 'ppt'
                return 'doc'
            }
            if (host.includes('drive.google.com')) return 'doc'
            return 'generic'
        } catch {
            return 'generic'
        }
    }

    const getLinkBadgeClass = (type: string) => {
        if (type === 'pdf') return 'bg-red-50 text-red-700 border-red-100'
        if (type === 'doc') return 'bg-blue-50 text-blue-700 border-blue-100'
        if (type === 'sheet') return 'bg-green-50 text-green-700 border-green-100'
        if (type === 'ppt') return 'bg-orange-50 text-orange-700 border-orange-100'
        if (type === 'image') return 'bg-purple-50 text-purple-700 border-purple-100'
        return 'bg-zinc-50 text-zinc-700 border-zinc-100'
    }

    const handleToggle = async (item: EventChecklistItemResponse) => {
        const originalItems = [...items]
        const updatedItems = items.map(i => i.id === item.id ? { ...i, is_completed: !i.is_completed } : i)
        setItems(updatedItems)

        try {
            await updateEventChecklistItem(event.id, item.id, { is_completed: !item.is_completed })
        } catch (error) {
            console.error(error)
            setItems(originalItems)
            toast.error('Failed to update task')
        }
    }

    const handleToggleVisibility = async (itemId: string, currentVisibility: string) => {
        const newVisibility: 'internal' | 'external' = currentVisibility === 'internal' ? 'external' : 'internal'
        const originalItems = [...items]
        const updatedItems = items.map(i => i.id === itemId ? { ...i, visibility: newVisibility } : i)
        setItems(updatedItems)

        try {
            await updateEventChecklistItem(event.id, itemId, { visibility: newVisibility })
            toast.success(`Task is now ${newVisibility}`)
        } catch (error) {
            console.error(error)
            setItems(originalItems)
            toast.error('Failed to update visibility')
        }
    }

    const handleDeleteClick = (itemId: string) => {
        setItemToDelete(itemId)
        setIsDeleteModalOpen(true)
    }

    const confirmDelete = async () => {
        if (!itemToDelete) return
        setIsDeleting(true)
        try {
            await deleteEventChecklistItem(event.id, itemToDelete)
            setItems(items.filter(i => i.id !== itemToDelete))
            toast.success('Task deleted')
            setIsDeleteModalOpen(false)
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete task')
        } finally {
            setIsDeleting(false)
            setItemToDelete(null)
        }
    }

    const handleToggleAssignUser = async (itemId: string, userId: string) => {
        const item = items.find(i => i.id === itemId)
        if (!item) return

        const currentIds = item.assigned_user_ids || []
        // Fallback for legacy data if needed, but API should normalize
        // If currentIds empty but assigned_user_id exists, include it?
        // Let's assume API response is clean or we handle it.

        let newIds = [...currentIds]
        if (newIds.includes(userId)) {
            newIds = newIds.filter(id => id !== userId)
        } else {
            newIds.push(userId)
        }

        // Optimistic Update
        setItems(items.map(i => i.id === itemId ? { ...i, assigned_user_ids: newIds } : i))

        try {
            await updateEventChecklistItem(event.id, itemId, { assigned_user_ids: newIds })
            // toast.success('Assignees updated') // Too noisy for multi-select
        } catch (error) {
            console.error(error)
            setItems(items.map(i => i.id === itemId ? { ...i, assigned_user_ids: currentIds } : i))
            toast.error('Failed to update assignees')
        }
    }

    const handleToggleFile = async (itemId: string, fileId: string) => {
        const item = items.find(i => i.id === itemId)
        if (!item) return

        const currentFiles = item.files || []
        const isLinked = currentFiles.some(f => f.id === fileId)
        let newFileIds: string[]
        if (isLinked) {
            newFileIds = currentFiles.filter(f => f.id !== fileId).map(f => f.id)
        } else {
            newFileIds = [...currentFiles.map(f => f.id), fileId]
        }

        // Optimistic Update
        const fileObj = files.find(f => f.id === fileId)
        if (fileObj) {
            const newFiles = isLinked
                ? currentFiles.filter(f => f.id !== fileId)
                : [...currentFiles, fileObj]
            setItems(items.map(i => i.id === itemId ? { ...i, files: newFiles } : i))
        }

        try {
            await updateEventChecklistItem(event.id, itemId, { file_ids: newFileIds })
            toast.success(isLinked ? 'File detached' : 'File attached')
        } catch (error) {
            console.error(error)
            setItems(items.map(i => i.id === itemId ? { ...i, files: currentFiles } : i))
            toast.error('Failed to update file attachment')
        }
    }

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newItemTitle.trim()) return

        const tempId = 'temp-' + Date.now()
        const tempItem: EventChecklistItemResponse = {
            id: tempId,
            event_id: event.id,
            title: newItemTitle,
            is_completed: false,
            sort_order: items.length + 1,
            created_by_user_id: 'me',
            created_at: new Date().toISOString(),
            assigned_user_ids: newItemUser ? [newItemUser.user_id] : [],
            visibility: newVisibility,
            files: newItemFile ? [newItemFile] : []
        }

        // Optimistic UI
        setItems([...items, tempItem])
        setNewItemTitle('')
        setNewItemUser(null)
        setNewItemFile(null)
        setNewItemLinkUrl('')
        setShowAssignMenu(false)

        try {
            const newItem = await createEventChecklistItem(event.id, {
                title: tempItem.title,
                assigned_user_ids: tempItem.assigned_user_ids,
                link_url: newItemLinkUrl.trim() ? newItemLinkUrl.trim() : undefined,
                visibility: newVisibility,
                audience_role: newVisibility === 'external' ? newAudienceRole ?? undefined : undefined,
                file_ids: newItemFile ? [newItemFile.id] : []
            })
            // Replace temp item with real one
            setItems(prev => prev.map(i => i.id === tempId ? newItem : i))
            toast.success('Task added')
        } catch (error) {
            console.error(error)
            setItems(prev => prev.filter(i => i.id !== tempId))
            toast.error('Failed to add task')
        }
    }

    const startEditLink = (item: EventChecklistItemResponse) => {
        setEditLinkItemId(item.id)
        setEditLinkValue(item.link_url || '')
    }

    const saveEditLink = async () => {
        if (!editLinkItemId) return
        const id = editLinkItemId
        const value = editLinkValue.trim() || null
        const original = items.find(i => i.id === id)
        if (!original) {
            setEditLinkItemId(null)
            return
        }
        setItems(items.map(i => i.id === id ? { ...i, link_url: value || undefined } : i))
        try {
            await updateEventChecklistItem(event.id, id, { link_url: value || undefined })
            toast.success('Link updated')
        } catch (error) {
            console.error(error)
            setItems(items.map(i => i.id === id ? original : i))
            toast.error('Failed to update link')
        } finally {
            setEditLinkItemId(null)
        }
    }

    const handleFileUpload = async () => {
        if (!uploadFile || !uploadTitle.trim() || !uploadItemId) return

        setUploading(true)
        try {
            // Upload file as EventProposal
            const newProposal = await createEventProposalWithFile(event.id, {
                title: uploadTitle,
                description: uploadDescription || '[file] Attached to checklist'
            }, uploadFile)

            // Link to checklist item
            const item = items.find(i => i.id === uploadItemId)
            if (item) {
                const currentFiles = item.files || []
                const newFileIds = [...currentFiles.map(f => f.id), newProposal.id]
                await updateEventChecklistItem(event.id, uploadItemId, { file_ids: newFileIds })

                // Optimistic Update
                setItems(items.map(i => i.id === uploadItemId ? { ...i, files: [...currentFiles, newProposal] } : i))
            }

            // Refresh files
            const updatedFiles = await getEventProposals(event.id)
            setFiles(updatedFiles)

            toast.success('File uploaded and linked!')
            setUploadItemId(null)
            setUploadFile(null)
            setUploadTitle('')
            setUploadDescription('')
        } catch (error) {
            console.error(error)
            toast.error('Failed to upload file')
        } finally {
            setUploading(false)
        }
    }

    const loadTemplate = async () => {
        const template = TEMPLATES[selectedTemplate]
        if (!template || template.tasks.length === 0) return

        setLoading(true)
        setShowTemplateModal(false)
        try {
            for (const task of template.tasks) {
                if (typeof task === 'string') {
                    await createEventChecklistItem(event.id, { title: task })
                } else {
                    const payload: any = { title: task.title }
                    if (task.link_url) payload.link_url = task.link_url
                    if (task.visibility) payload.visibility = task.visibility
                    if (task.assigned_role) {
                        const target = participants.find(p => p.role === task.assigned_role)
                        if (target) payload.assigned_user_ids = [target.user_id]
                    }
                    await createEventChecklistItem(event.id, payload)
                }
            }
            await fetchChecklist()
            toast.success(`${template.name} template loaded`)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load template')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn space-y-6">
            <div className="flex items-center justify-between">
                <div />
                <div />
                {!loading && items.length === 0 && (
                    <button
                        onClick={() => setShowTemplateModal(true)}
                        className="text-sm font-bold text-yellow-600 hover:text-yellow-700 underline decoration-yellow-400 decoration-2 underline-offset-2"
                    >
                        Load a Template
                    </button>
                )}
            </div>

            {/* Template Modal */}
            <Transition appear show={showTemplateModal} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setShowTemplateModal(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-0 text-left align-middle shadow-xl transition-all">
                                    <div className="flex h-[600px]">
                                        {/* Sidebar: Templates List */}
                                        <div className="w-1/3 border-r border-zinc-100 bg-zinc-50 p-6 flex flex-col gap-2">
                                            <Dialog.Title as="h3" className="text-lg font-black text-zinc-900 mb-4">
                                                Select Template
                                            </Dialog.Title>
                                            {Object.values(TEMPLATES).map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setSelectedTemplate(t.id as keyof typeof TEMPLATES)}
                                                    disabled={t.id === 'coming_soon'}
                                                    className={`p-4 rounded-xl text-left transition-all border-2 ${selectedTemplate === t.id
                                                        ? 'bg-white border-yellow-400 shadow-md ring-1 ring-yellow-400'
                                                        : t.id === 'coming_soon'
                                                            ? 'opacity-50 cursor-not-allowed border-transparent'
                                                            : 'hover:bg-white border-transparent hover:border-zinc-200'
                                                        }`}
                                                >
                                                    <div className="font-bold text-zinc-900 text-sm">{t.name}</div>
                                                    <div className="text-xs text-zinc-500 mt-1">{t.description}</div>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Main: Preview */}
                                        <div className="flex-1 p-8 flex flex-col">
                                            <div className="flex-1 overflow-y-auto">
                                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Tasks Preview</h4>
                                                <ul className="space-y-3">
                                                    {TEMPLATES[selectedTemplate].tasks.length > 0 ? (
                                                        TEMPLATES[selectedTemplate].tasks.map((task: any, i: number) => {
                                                            const title = typeof task === 'string' ? task : task.title
                                                            const link = typeof task === 'string' ? null : task.link_url || null
                                                            const role = typeof task === 'string' ? null : task.assigned_role || null
                                                            let linkLabel = ''
                                                            if (link) {
                                                                try {
                                                                    const u = new URL(link)
                                                                    const path = u.pathname
                                                                    const ext = (path.split('.').pop() || '').toUpperCase()
                                                                    linkLabel = ext || u.hostname.replace('www.', '')
                                                                } catch {
                                                                    linkLabel = 'Link'
                                                                }
                                                            }
                                                            return (
                                                                <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                                                    <div className="w-5 h-5 rounded-md border-2 border-zinc-300" />
                                                                    <span className="text-sm font-bold text-zinc-700">{title}</span>
                                                                    {role && (
                                                                        <span className="ml-auto text-xs px-2 py-1 rounded-lg border bg-zinc-50 text-zinc-700 border-zinc-200">
                                                                            Assigned: {role}
                                                                        </span>
                                                                    )}
                                                                    {link && (
                                                                        <span className="text-xs px-2 py-1 rounded-lg border bg-blue-50 text-blue-700 border-blue-100">
                                                                            {linkLabel}
                                                                        </span>
                                                                    )}
                                                                </li>
                                                            )
                                                        })
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">
                                                            No tasks in this template yet.
                                                        </div>
                                                    )}
                                                </ul>
                                            </div>
                                            <div className="pt-6 border-t border-zinc-100 flex justify-end gap-3">
                                                <button
                                                    onClick={() => setShowTemplateModal(false)}
                                                    className="px-4 py-2 rounded-xl text-zinc-500 font-bold text-sm hover:bg-zinc-100 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={loadTemplate}
                                                    disabled={TEMPLATES[selectedTemplate].tasks.length === 0}
                                                    className="px-6 py-2 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 disabled:opacity-50"
                                                >
                                                    Use Template
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-zinc-200 overflow-visible shadow-sm">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-100 bg-zinc-50">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setViewVisibility('all')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold ${viewVisibility === 'all' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setViewVisibility('internal')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold ${viewVisibility === 'internal' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'}`}
                                >
                                    Internal
                                </button>
                                <button
                                    onClick={() => setViewVisibility('external')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold ${viewVisibility === 'external' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'}`}
                                >
                                    External
                                </button>
                            </div>
                            <button
                                onClick={() => setShowPreviewModal(true)}
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-zinc-200 text-blue-700 hover:bg-blue-50"
                                title="Preview what external participants will see"
                            >
                                Preview Public
                            </button>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 border-b border-zinc-100">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Task</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Assigned To</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Visibility</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">File</th>
                                    <th className="px-6 py-4 w-12 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 font-medium">
                                            No tasks yet. Add one below!
                                        </td>
                                    </tr>
                                ) : (
                                    items
                                        .filter(i => viewVisibility === 'all' ? true : (i.visibility || 'internal') === viewVisibility)
                                        .map((item) => (
                                            <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors group">
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleToggle(item)}
                                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.is_completed
                                                            ? 'bg-green-500 border-green-500 text-white'
                                                            : 'bg-zinc-50 border-zinc-300 text-transparent hover:border-yellow-400'
                                                            }`}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-bold transition-all ${item.is_completed ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                                                        {item.title}
                                                    </span>
                                                    {/* Linked Files Display */}
                                                    {(() => {
                                                        const linkedFiles = item.files || []

                                                        if (linkedFiles.length > 0) {
                                                            return (
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {linkedFiles.map(f => (
                                                                        <a
                                                                            key={f.id}
                                                                            href={f.file_url ?? '#'}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-100"
                                                                            title={f.title ?? ''}
                                                                        >
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                                            {f.title}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )
                                                        }
                                                        return null
                                                    })()}
                                                    {item.link_url && (
                                                        <div className="mt-2 max-w-full">
                                                            {(() => {
                                                                const type = getLinkType(item.link_url || '')
                                                                const classes = getLinkBadgeClass(type)
                                                                let label = ''
                                                                try {
                                                                    const u = new URL(item.link_url || '')
                                                                    const path = u.pathname
                                                                    const ext = (path.split('.').pop() || '').toUpperCase()
                                                                    label = ext || u.hostname.replace('www.', '')
                                                                } catch {
                                                                    label = 'Link'
                                                                }
                                                                return (
                                                                    <a
                                                                        href={item.link_url || '#'}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors border max-w-full ${classes}`}
                                                                        title={item.link_url || ''}
                                                                    >
                                                                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                                        <span className="truncate max-w-[200px] block">{label}</span>
                                                                    </a>
                                                                )
                                                            })()}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Menu as="div" className="relative">
                                                        <Menu.Button className="w-full text-left focus:outline-none">
                                                            {item.assigned_user_ids && item.assigned_user_ids.length > 0 ? (
                                                                <div className="flex items-center -space-x-2 px-2 py-1 -ml-2 rounded-lg hover:bg-zinc-100 transition-colors">
                                                                    {item.assigned_user_ids.map(uid => {
                                                                        const person = committee.find(p => p.id === uid) || committee.find(p => p.user_id === uid)
                                                                        if (!person) return null
                                                                        return (
                                                                            <div key={uid} className="w-6 h-6 rounded-full bg-zinc-100 ring-2 ring-white overflow-hidden relative" title={person.full_name}>
                                                                                {person.avatar_url ? (
                                                                                    <Image src={person.avatar_url} alt={person.full_name} fill className="object-cover" />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-[10px] font-bold">
                                                                                        {person.full_name[0]}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })}
                                                                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] text-zinc-400 font-bold ring-2 ring-white hover:bg-zinc-50">
                                                                        +
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="px-2 py-1 -ml-2 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer group-hover:bg-white text-zinc-400 italic text-xs hover:text-blue-500">
                                                                    Assign...
                                                                </div>
                                                            )}
                                                        </Menu.Button>
                                                        <Transition
                                                            as={Fragment}
                                                            enter="transition ease-out duration-100"
                                                            enterFrom="transform opacity-0 scale-95"
                                                            enterTo="transform opacity-100 scale-100"
                                                            leave="transition ease-in duration-75"
                                                            leaveFrom="transform opacity-100 scale-100"
                                                            leaveTo="transform opacity-0 scale-95"
                                                        >
                                                            <Menu.Items className="absolute left-0 bottom-full mb-2 w-56 origin-bottom-left divide-y divide-zinc-100 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                                                <div className="p-1 max-h-60 overflow-y-auto">
                                                                    {committee.length > 0 ? (
                                                                        committee.map(u => {
                                                                            const isAssigned = (item.assigned_user_ids || []).includes(u.user_id) || (item.assigned_user_ids || []).includes(u.id)
                                                                            return (
                                                                                <Menu.Item key={u.id}>
                                                                                    {({ active }) => (
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.preventDefault() // Try to prevent close?
                                                                                                handleToggleAssignUser(item.id, u.user_id)
                                                                                            }}
                                                                                            className={`${active ? 'bg-yellow-50 text-zinc-900' : 'text-zinc-700'
                                                                                                } group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs font-bold`}
                                                                                        >
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                                                                                                    {u.full_name[0]}
                                                                                                </div>
                                                                                                {u.full_name}
                                                                                            </div>
                                                                                            {isAssigned && (
                                                                                                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                                                                </svg>
                                                                                            )}
                                                                                        </button>
                                                                                    )}
                                                                                </Menu.Item>
                                                                            )
                                                                        })
                                                                    ) : (
                                                                        <div className="px-2 py-2 text-xs text-zinc-400 italic">No members available</div>
                                                                    )}
                                                                </div>
                                                            </Menu.Items>
                                                        </Transition>
                                                    </Menu>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Menu as="div" className="relative">
                                                        <Menu.Button className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-2 ${item.visibility === 'external'
                                                            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                                                            : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                                                            }`}>
                                                            {item.visibility === 'external' ? (
                                                                <>
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                    {item.audience_role ? `External: ${item.audience_role.charAt(0).toUpperCase() + item.audience_role.slice(1)}` : 'External'}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                                    </svg>
                                                                    Internal
                                                                </>
                                                            )}
                                                        </Menu.Button>
                                                        <Transition
                                                            as={Fragment}
                                                            enter="transition ease-out duration-100"
                                                            enterFrom="transform opacity-0 scale-95"
                                                            enterTo="transform opacity-100 scale-100"
                                                            leave="transition ease-in duration-75"
                                                            leaveFrom="transform opacity-100 scale-100"
                                                            leaveTo="transform opacity-0 scale-95"
                                                        >
                                                            <Menu.Items className="absolute left-0 mt-2 w-48 origin-top-left rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden">
                                                                <div className="p-1">
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                onClick={() => updateEventChecklistItem(event.id, item.id, { visibility: 'internal', audience_role: null }).then(() => fetchChecklist()).catch(e => toast.error('Failed to update'))}
                                                                                className={`${active ? 'bg-zinc-100' : ''} text-gray-700 group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold`}
                                                                            >
                                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                                                </svg>
                                                                                Internal
                                                                            </button>
                                                                        )}
                                                                    </Menu.Item>
                                                                    <div className="border-t border-zinc-100 my-1" />
                                                                    <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase">External to:</div>
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                onClick={() => updateEventChecklistItem(event.id, item.id, { visibility: 'external', audience_role: null }).then(() => fetchChecklist()).catch(e => toast.error('Failed to update'))}
                                                                                className={`${active ? 'bg-amber-50' : ''} text-gray-700 group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold`}
                                                                            >
                                                                                All Attendees
                                                                            </button>
                                                                        )}
                                                                    </Menu.Item>
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                onClick={() => updateEventChecklistItem(event.id, item.id, { visibility: 'external', audience_role: 'speaker' as EventParticipantRole }).then(() => fetchChecklist()).catch(e => toast.error('Failed to update'))}
                                                                                className={`${active ? 'bg-amber-50' : ''} text-gray-700 group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold`}
                                                                            >
                                                                                Speaker
                                                                            </button>
                                                                        )}
                                                                    </Menu.Item>
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                onClick={() => updateEventChecklistItem(event.id, item.id, { visibility: 'external', audience_role: 'sponsor' as EventParticipantRole }).then(() => fetchChecklist()).catch(e => toast.error('Failed to update'))}
                                                                                className={`${active ? 'bg-amber-50' : ''} text-gray-700 group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold`}
                                                                            >
                                                                                Sponsor
                                                                            </button>
                                                                        )}
                                                                    </Menu.Item>
                                                                    <Menu.Item>
                                                                        {({ active }) => (
                                                                            <button
                                                                                onClick={() => updateEventChecklistItem(event.id, item.id, { visibility: 'external', audience_role: 'attendee' as EventParticipantRole }).then(() => fetchChecklist()).catch(e => toast.error('Failed to update'))}
                                                                                className={`${active ? 'bg-amber-50' : ''} text-gray-700 group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold`}
                                                                            >
                                                                                Attendee
                                                                            </button>
                                                                        )}
                                                                    </Menu.Item>
                                                                </div>
                                                            </Menu.Items>
                                                        </Transition>
                                                    </Menu>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {/* Attach File/Menu */}
                                                    <Menu as="div" className="relative inline-block text-left">
                                                        <Menu.Button className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all focus:outline-none">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                            </svg>
                                                        </Menu.Button>
                                                        <Transition
                                                            as={Fragment}
                                                            enter="transition ease-out duration-100"
                                                            enterFrom="transform opacity-0 scale-95"
                                                            enterTo="transform opacity-100 scale-100"
                                                            leave="transition ease-in duration-75"
                                                            leaveFrom="transform opacity-100 scale-100"
                                                            leaveTo="transform opacity-0 scale-95"
                                                        >
                                                            <Menu.Items className="absolute right-0 top-full mt-1 w-56 origin-top-right divide-y divide-zinc-100 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                                                <div className="p-1 max-h-60 overflow-y-auto">
                                                                    <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                                        Quick Create
                                                                    </div>
                                                                    <div className="px-2 py-1 flex flex-col gap-1">
                                                                        <a href="https://docs.new" target="_blank" rel="noreferrer" className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-blue-50 text-zinc-700">Create Google Doc</a>
                                                                        <a href="https://sheets.new" target="_blank" rel="noreferrer" className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-green-50 text-zinc-700">Create Google Sheet</a>
                                                                        <a href="https://slides.new" target="_blank" rel="noreferrer" className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-orange-50 text-zinc-700">Create Google Slide</a>
                                                                    </div>
                                                                    <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                                        Upload File
                                                                    </div>
                                                                    <div className="px-3 py-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                setUploadItemId(item.id)
                                                                                setUploadTitle('')
                                                                                setUploadDescription('')
                                                                                setUploadFile(null)
                                                                            }}
                                                                            className="w-full text-left px-3 py-2 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                                            Upload File…
                                                                        </button>
                                                                    </div>
                                                                    <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                                        Attach File
                                                                    </div>
                                                                    {files.length > 0 ? (
                                                                        files.map(f => {
                                                                            const isLinked = (item.files || []).some(file => file.id === f.id)
                                                                            return (
                                                                                <Menu.Item key={f.id}>
                                                                                    {({ active }) => (
                                                                                        <button
                                                                                            onClick={() => handleToggleFile(item.id, f.id)}
                                                                                            className={`${active ? 'bg-blue-50 text-blue-900' : 'text-zinc-700'
                                                                                                } group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold`}
                                                                                        >
                                                                                            <span className="truncate">{f.title || 'Untitled'}</span>
                                                                                            {isLinked && (
                                                                                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                                                                </svg>
                                                                                            )}
                                                                                        </button>
                                                                                    )}
                                                                                </Menu.Item>
                                                                            )
                                                                        })
                                                                    ) : (
                                                                        <div className="px-3 py-2 text-xs text-zinc-400 italic">No files available</div>
                                                                    )}
                                                                    <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                                        Attach External Link
                                                                    </div>
                                                                    <div className="px-3 py-2">
                                                                        {editLinkItemId === item.id ? (
                                                                            <div className="flex flex-col gap-2">
                                                                                <input
                                                                                    autoFocus
                                                                                    type="url"
                                                                                    value={editLinkValue}
                                                                                    onChange={(e) => setEditLinkValue(e.target.value)}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') {
                                                                                            e.preventDefault()
                                                                                            saveEditLink()
                                                                                        }
                                                                                        e.stopPropagation()
                                                                                    }}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    placeholder="https://..."
                                                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                                                />
                                                                                <div className="flex items-center gap-2 justify-end">
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault()
                                                                                            e.stopPropagation()
                                                                                            setEditLinkItemId(null)
                                                                                        }}
                                                                                        className="px-2 py-1 text-xs font-bold text-zinc-500 hover:bg-zinc-100 rounded-md transition-colors"
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault()
                                                                                            e.stopPropagation()
                                                                                            saveEditLink()
                                                                                        }}
                                                                                        className="px-3 py-1 bg-zinc-900 text-white rounded-md text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
                                                                                    >
                                                                                        Save
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.preventDefault()
                                                                                    e.stopPropagation()
                                                                                    startEditLink(item)
                                                                                }}
                                                                                className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-zinc-300 text-xs font-bold text-zinc-500 hover:text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 transition-all flex items-center gap-2"
                                                                            >
                                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                                                </svg>
                                                                                Paste external link…
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </Menu.Items>
                                                        </Transition>
                                                    </Menu>

                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteClick(item.id)}
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all px-2 py-1"
                                                        title="Remove"
                                                    >
                                                        ×
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Inline Add Task Row */}
                    <div className="bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-yellow-400/50 transition-colors p-4 flex gap-4 items-center">
                        <div className="w-6 h-6 rounded-lg border-2 border-zinc-300 bg-white" />
                        <form onSubmit={handleAdd} className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
                            <input
                                type="text"
                                value={newItemTitle}
                                onChange={(e) => setNewItemTitle(e.target.value)}
                                placeholder="Add a new task... (Press Enter)"
                                className="flex-1 bg-transparent border-none p-0 text-base font-medium placeholder-zinc-400 focus:ring-0 text-zinc-900"
                            />
                            {/* External link moved into Attach menu */}
                            <div className="flex items-center gap-2">
                                <select
                                    value={newVisibility}
                                    onChange={(e) => {
                                        const v = e.target.value as 'internal' | 'external'
                                        setNewVisibility(v)
                                        if (v === 'internal') setNewAudienceRole(null)
                                    }}
                                    className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700"
                                >
                                    <option value="internal">Internal</option>
                                    <option value="external">External</option>
                                </select>
                                {newVisibility === 'external' && (
                                    <select
                                        value={newAudienceRole || ''}
                                        onChange={(e) => setNewAudienceRole((e.target.value || null) as any)}
                                        className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700"
                                    >
                                        <option value="">All Attendees</option>
                                        <option value="speaker">Speaker</option>
                                        <option value="sponsor">Sponsor</option>
                                        <option value="audience">Audience</option>
                                    </select>
                                )}
                            </div>

                            <div className="relative flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAssignMenu(!showAssignMenu)
                                        setShowAttachMenu(false)
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${newItemUser
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-yellow-400'
                                        }`}
                                >
                                    {newItemUser ? (
                                        <>
                                            <span className="text-blue-600">@</span> {newItemUser.full_name}
                                        </>
                                    ) : (
                                        <>
                                            <span>Assign</span>
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAttachMenu(!showAttachMenu)
                                        setShowAssignMenu(false)
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${newItemFile || newItemLinkUrl.trim()
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-yellow-400'
                                        }`}
                                >
                                    {newItemFile ? (
                                        <>
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                            {newItemFile.title}
                                        </>
                                    ) : (
                                        <>
                                            <span>Attach</span>
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </>
                                    )}
                                </button>

                                {showAssignMenu && (
                                    <div className="absolute bottom-full right-0 mb-2 w-64 bg-white border border-zinc-100 rounded-xl shadow-xl overflow-hidden z-20">
                                        <div className="max-h-60 overflow-y-auto">
                                            <div className="px-3 py-2 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                Assign to Member
                                            </div>
                                            {committee.length > 0 ? (
                                                committee.map(u => {
                                                    const pr = participants.find(p => p.user_id === u.user_id)
                                                    const roleTag = pr ? pr.role : null
                                                    return (
                                                        <button
                                                            key={u.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setNewItemUser(u)
                                                                setNewItemFile(null)
                                                                setShowAssignMenu(false)
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-yellow-50 flex items-center gap-3 group"
                                                        >
                                                            <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold group-hover:bg-yellow-100 text-zinc-600">
                                                                {u.full_name[0]}
                                                            </div>
                                                            <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-900">{u.full_name}</span>
                                                            {roleTag && (
                                                                <span className="ml-auto text-[10px] px-2 py-1 rounded-lg border bg-zinc-50 text-zinc-600 border-zinc-200">
                                                                    {roleTag}
                                                                </span>
                                                            )}
                                                        </button>
                                                    )
                                                })
                                            ) : (
                                                <div className="px-4 py-3 text-xs text-zinc-400 italic">No members found</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {showAttachMenu && (
                                    <div className="absolute bottom-full right-0 mb-2 w-64 bg-white border border-zinc-100 rounded-xl shadow-xl overflow-hidden z-20">
                                        <div className="max-h-60 overflow-y-auto">
                                            <div className="px-3 py-2 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                Quick Create
                                            </div>
                                            <div className="px-2 py-1 flex flex-col gap-1">
                                                <a href="https://docs.new" target="_blank" rel="noreferrer" className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-blue-50 text-zinc-700">Create Google Doc</a>
                                                <a href="https://sheets.new" target="_blank" rel="noreferrer" className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-green-50 text-zinc-700">Create Google Sheet</a>
                                                <a href="https://slides.new" target="_blank" rel="noreferrer" className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-orange-50 text-zinc-700">Create Google Slide</a>
                                            </div>
                                            <div className="px-3 py-2 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-t border-zinc-100">
                                                Attach File
                                            </div>
                                            {files.length > 0 ? (
                                                files.map(f => (
                                                    <button
                                                        key={f.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewItemFile(f)
                                                            setNewItemUser(null)
                                                            setShowAttachMenu(false)
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 group"
                                                    >
                                                        <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                        </div>
                                                        <span className="text-xs font-bold text-zinc-700 group-hover:text-blue-800 truncate">{f.title || 'Untitled File'}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-3 text-xs text-zinc-400 italic">No files available</div>
                                            )}
                                            <div className="px-3 py-2 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-t border-zinc-100">
                                                Attach External Link
                                            </div>
                                            <div className="px-4 py-3 flex items-center gap-2">
                                                <input
                                                    type="url"
                                                    value={newItemLinkUrl}
                                                    onChange={(e) => setNewItemLinkUrl(e.target.value)}
                                                    placeholder="Paste link"
                                                    className="flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold placeholder-zinc-400 focus:ring-2 focus:ring-yellow-400"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAttachMenu(false)}
                                                    className="px-2 py-1 bg-zinc-900 text-yellow-400 rounded-lg text-xs font-bold"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={!newItemTitle.trim()}
                                className="p-2 bg-zinc-900 text-yellow-400 rounded-lg shadow-sm hover:scale-105 transition-all disabled:opacity-0 disabled:scale-0"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* File Upload Modal */}
            <Transition appear show={uploadItemId !== null} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setUploadItemId(null)}>
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
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all border border-zinc-100">
                                    <Dialog.Title as="h3" className="text-lg font-bold text-zinc-900 mb-2">
                                        Upload File
                                    </Dialog.Title>
                                    <p className="text-sm text-zinc-500 mb-4">
                                        Upload a file and link it to this checklist task.
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-700 mb-2">File</label>
                                            <input
                                                type="file"
                                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                className="w-full px-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 outline-none transition-all text-zinc-900 text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-zinc-700 mb-2">Title</label>
                                            <input
                                                type="text"
                                                value={uploadTitle}
                                                onChange={(e) => setUploadTitle(e.target.value)}
                                                className="w-full px-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 outline-none transition-all text-zinc-900"
                                                placeholder="e.g., Speaker Proposal"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-zinc-700 mb-2">Description (optional)</label>
                                            <textarea
                                                value={uploadDescription}
                                                onChange={(e) => setUploadDescription(e.target.value)}
                                                className="w-full px-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-yellow-400 focus:ring-yellow-400 outline-none transition-all resize-none text-zinc-900"
                                                rows={3}
                                                placeholder="Additional notes..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            onClick={() => setUploadItemId(null)}
                                            className="px-4 py-2 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-colors text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleFileUpload}
                                            disabled={!uploadFile || !uploadTitle.trim() || uploading}
                                            className="px-4 py-2 bg-zinc-900 text-yellow-400 font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md text-sm disabled:opacity-50"
                                        >
                                            {uploading ? 'Uploading...' : 'Upload'}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Task"
                message="Are you sure you want to delete this checklist task?"
                confirmText="Yes, Delete"
                variant="danger"
                isLoading={isDeleting}
            />

            {/* Preview Public Modal */}
            <Transition appear show={showPreviewModal} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setShowPreviewModal(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
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
                                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all">
                                    <div className="border-b border-zinc-100 px-6 py-5 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <Dialog.Title as="h3" className="text-xl font-black text-zinc-900">
                                            Public Preview - External Tasks
                                        </Dialog.Title>
                                        <button
                                            onClick={() => setShowPreviewModal(false)}
                                            className="text-zinc-400 hover:text-zinc-600 transition-colors p-2 hover:bg-white/50 rounded-full"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>

                                    <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                                        {(() => {
                                            const externalItems = items.filter(i => i.visibility === 'external')

                                            if (externalItems.length === 0) {
                                                return (
                                                    <div className="text-center py-12">
                                                        <svg className="w-16 h-16 mx-auto text-zinc-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        <p className="text-zinc-400 font-medium">No external tasks yet</p>
                                                        <p className="text-zinc-400 text-sm mt-1">Create tasks with "External" visibility to see them here</p>
                                                    </div>
                                                )
                                            }

                                            // Render consistent 'What to Prepare' style
                                            return (
                                                <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-100 rounded-full blur-xl opacity-60 group-hover:scale-110 transition-transform"></div>
                                                    <h3 className="text-sm font-black text-amber-900 uppercase tracking-wide mb-4 flex items-center gap-2 relative z-10">
                                                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                        </svg>
                                                        What to Prepare
                                                    </h3>
                                                    <ul className="space-y-4 relative z-10">
                                                        {externalItems.map((item, index) => {
                                                            const linkedFiles = item.files || []

                                                            return (
                                                                <li key={item.id} className="flex gap-3 text-amber-900 group/item">
                                                                    <div className="w-6 h-6 rounded-lg bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-sm font-bold text-xs text-amber-700">
                                                                        {index + 1}
                                                                    </div>
                                                                    <div className="flex-1 pt-0.5">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="text-sm font-bold leading-tight">{item.title}</span>
                                                                            {item.audience_role && (
                                                                                <span className="text-[10px] font-bold bg-amber-200/50 text-amber-800 px-1.5 py-0.5 rounded capitalize">
                                                                                    {item.audience_role}
                                                                                </span>
                                                                            )}
                                                                            {/* External Link Badge */}
                                                                            {item.link_url && (
                                                                                <a
                                                                                    href={item.link_url}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors flex items-center gap-1"
                                                                                >
                                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                                                    </svg>
                                                                                    Link
                                                                                </a>
                                                                            )}
                                                                            {/* File Badges */}
                                                                            {linkedFiles.map(f => (
                                                                                <a
                                                                                    key={f.id}
                                                                                    href={f.file_url ?? '#'}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors flex items-center gap-1"
                                                                                    title={f.title ?? ''}
                                                                                >
                                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                    </svg>
                                                                                    File
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                        {item.description && (
                                                                            <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">{item.description}</p>
                                                                        )}
                                                                    </div>
                                                                </li>
                                                            )
                                                        })}
                                                    </ul>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    )
}
