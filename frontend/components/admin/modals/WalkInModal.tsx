import React, { useState, useEffect } from 'react'
import { Dialog, Transition, Tab } from '@headlessui/react'
import { Fragment } from 'react'
import { toast } from 'react-hot-toast'
import { organizerWalkInAttendance, createWalkInToken, getWalkInTokens } from '@/services/api'
import { EventDetails, EventWalkInTokenResponse } from '@/services/api.types'

interface WalkInModalProps {
    isOpen: boolean
    onClose: () => void
    event: EventDetails
    onSuccess: () => void
}

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

export function WalkInModal({ isOpen, onClose, event, onSuccess }: WalkInModalProps) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    
    // Token State
    const [tokens, setTokens] = useState<EventWalkInTokenResponse[]>([])
    const [tokenLabel, setTokenLabel] = useState('')
    const [tokenMaxUses, setTokenMaxUses] = useState<string>('') // empty = unlimited
    const [creatingToken, setCreatingToken] = useState(false)
    const [showHint, setShowHint] = useState(true)

    useEffect(() => {
        if (isOpen) {
            fetchTokens()
        }
    }, [isOpen, event.id])

    const fetchTokens = async () => {
        try {
            const data = await getWalkInTokens(event.id)
            setTokens(data)
        } catch (error) {
            console.error('Failed to fetch tokens', error)
        }
    }

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !email.trim()) {
            toast.error('Please fill in all fields')
            return
        }

        setLoading(true)
        try {
            await organizerWalkInAttendance(event.id, { name, email })
            toast.success('Attendance recorded')
            setName('')
            setEmail('')
            onSuccess()
            // Don't close, maybe they want to add more
        } catch (error: any) {
            console.error(error)
            toast.error(error.response?.data?.detail || 'Failed to record attendance')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateToken = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreatingToken(true)
        try {
            const maxUses = tokenMaxUses ? parseInt(tokenMaxUses) : null
            const newToken = await createWalkInToken(event.id, {
                label: tokenLabel || 'Walk-in Link',
                max_uses: maxUses
            })
            setTokens([newToken, ...tokens])
            setTokenLabel('')
            setTokenMaxUses('')
            toast.success('Link generated')
        } catch (error: any) {
            toast.error('Failed to generate link')
        } finally {
            setCreatingToken(false)
        }
    }

    const copyLink = (token: string) => {
        const url = `${window.location.origin}/walk-in/${token}`
        navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard')
    }

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
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                            <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
                                <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">
                                    Walk-in Management
                                </Dialog.Title>
                                <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
                                    <span className="sr-only">Close</span>
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <Tab.Group>
                                <div className="border-b border-gray-200">
                                    <Tab.List className="-mb-px flex space-x-8 px-6">
                                        <Tab
                                            className={({ selected }) =>
                                                classNames(
                                                    selected
                                                        ? 'border-yellow-500 text-yellow-600'
                                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                                                    'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium focus:outline-none flex items-center gap-2'
                                                )
                                            }
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3.75 19.5a1.5 1.5 0 011.5-1.5h11.25a1.5 1.5 0 011.5 1.5" />
                                            </svg>
                                            Manual Entry
                                        </Tab>
                                        <Tab
                                            className={({ selected }) =>
                                                classNames(
                                                    selected
                                                        ? 'border-yellow-500 text-yellow-600'
                                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                                                    'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium focus:outline-none flex items-center gap-2'
                                                )
                                            }
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                            </svg>
                                            Registration Links
                                        </Tab>
                                    </Tab.List>
                                </div>
                                
                                <Tab.Panels className="p-6">
                                    {/* Manual Entry Panel */}
                                    <Tab.Panel>
                                        <div className="mb-4">
                                            <p className="text-sm text-zinc-900">
                                                Manually add a participant who is physically present. They will be marked as attended immediately.
                                            </p>
                                        </div>
                                        <form onSubmit={handleManualSubmit} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={e => setName(e.target.value)}
                                                    className="text-gray-700 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm px-4 py-2 border"
                                                    placeholder="Full Name"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    className="text-gray-700 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm px-4 py-2 border"
                                                    placeholder="email@example.com"
                                                    required
                                                />
                                            </div>

                                            <div className="mt-6 flex justify-end gap-3">
                                                <button
                                                    type="submit"
                                                    className="w-full sm:w-auto px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 disabled:opacity-50"
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Recording...' : 'Record Attendance'}
                                                </button>
                                            </div>
                                        </form>
                                    </Tab.Panel>

                                    {/* Links Panel */}
                                    <Tab.Panel>
                                        {showHint && (
                                            <div className="mb-6 bg-yellow-50 border border-yellow-100 rounded-lg p-4 relative">
                                                <button 
                                                    onClick={() => setShowHint(false)}
                                                    className="absolute top-2 right-2 text-zinc-900 hover:text-zinc-600"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                                    </svg>
                                                </button>
                                                <h4 className="text-sm font-bold text-zinc-900 mb-1">How this works</h4>
                                                <p className="text-xs text-zinc-900 pr-4">
                                                    Generate a unique link for attendees to register themselves at the venue. 
                                                    You can set a limit on how many times a link can be used.
                                                    Display the QR code (generated from the link) on a screen or print it out.
                                                </p>
                                            </div>
                                        )}

                                        <form onSubmit={handleCreateToken} className="mb-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                            <h4 className="text-sm font-bold text-zinc-900 mb-3">Create New Link</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Label (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={tokenLabel}
                                                        onChange={e => setTokenLabel(e.target.value)}
                                                        placeholder="e.g. Front Desk QR"
                                                        className="w-full text-sm text-gray-900 rounded-lg border-zinc-300 focus:border-yellow-500 focus:ring-yellow-500 placeholder:text-gray-400"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Max Uses (Optional)</label>
                                                    <input
                                                        type="number"
                                                        value={tokenMaxUses}
                                                        onChange={e => setTokenMaxUses(e.target.value)}
                                                        placeholder="Unlimited"
                                                        className="w-full text-sm text-gray-900 rounded-lg border-zinc-300 focus:border-yellow-500 focus:ring-yellow-500 placeholder:text-gray-400"
                                                        min="1"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={creatingToken}
                                                    className="text-sm bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-50"
                                                >
                                                    {creatingToken ? 'Generating...' : 'Generate Link'}
                                                </button>
                                            </div>
                                        </form>

                                        <div className="space-y-3">
                                            <h4 className="text-sm font-bold text-zinc-900">Active Links</h4>
                                            {tokens.length === 0 ? (
                                                <p className="text-sm text-zinc-400 italic">No active links yet.</p>
                                            ) : (
                                                tokens.map(token => (
                                                    <div key={token.id} className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-lg shadow-sm">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-medium text-zinc-900 truncate">
                                                                    {token.label || 'Untitled Link'}
                                                                </p>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${token.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {token.is_active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Used: {token.current_uses} / {token.max_uses === null ? '∞' : token.max_uses}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => copyLink(token.token)}
                                                            className="ml-4 p-2 text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                                            title="Copy Link"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.251 2.251 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </Tab.Panel>
                                </Tab.Panels>
                            </Tab.Group>
                        </Dialog.Panel>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
