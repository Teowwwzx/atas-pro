'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getDIYChannels, getMe } from '@/services/api'
import { ChatConversation, UserMeResponse } from '@/services/api.types'
import { ChatBubbleIcon, Cross2Icon, SizeIcon } from '@radix-ui/react-icons'
import { Transition } from '@headlessui/react'
import { DIYChatWindow } from './DIYChatWindow'

export function DIYFloatingChatWrapper() {
    const [isOpen, setIsOpen] = useState(false)
    const [conversations, setConversations] = useState<ChatConversation[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [me, setMe] = useState<UserMeResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [unreadCount, setUnreadCount] = useState(0)

    const router = useRouter()
    const pathname = usePathname()
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Initial load
    useEffect(() => {
        getMe().then(setMe).catch(() => {/* Ignore */ })
    }, [])

    // Load conversations when opened
    useEffect(() => {
        if (isOpen && me) {
            loadChannels()
        }
    }, [isOpen, me])

    // Reset selection when closed
    useEffect(() => {
        if (!isOpen) {
            setSelectedId(null)
        }
    }, [isOpen])

    const loadChannels = async () => {
        try {
            setLoading(true)
            const convsData = await getDIYChannels()
            setConversations(convsData)
            const totalUnread = convsData.reduce((acc, c) => acc + c.unread_count, 0)
            setUnreadCount(totalUnread)
        } catch (error) {
            console.error('Failed to load chat channels', error)
        } finally {
            setLoading(false)
        }
    }

    const handleExpand = () => {
        setIsOpen(false)
        router.push('/messages') // Fallback to full page if needed
    }

    const selectedConv = conversations.find(c => c.id === selectedId)

    // Hide on full messages page to avoid duplication
    // We could change this to /diy-messages later
    if (pathname === '/messages') return null

    return (
        <div className="fixed bottom-40 right-4 md:bottom-28 md:right-8 z-50 flex flex-col items-end" ref={wrapperRef}>
            {/* Chat Modal */}
            <Transition
                show={isOpen}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-10 scale-95"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-10 scale-95"
            >
                <div className="mb-4 w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-4 bg-zinc-900 text-white flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-lg">
                            {selectedId ? (selectedConv?.name || 'Chat') : 'Messages'}
                        </h3>
                        <div className="flex items-center gap-2">
                            {selectedId && (
                                <button
                                    onClick={() => setSelectedId(null)}
                                    className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white text-sm mr-2"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={handleExpand}
                                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                                title="Open full screen"
                            >
                                <SizeIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                            >
                                <Cross2Icon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden relative bg-white">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-zinc-200 border-t-yellow-400 rounded-full animate-spin"></div>
                            </div>
                        ) : selectedId && selectedConv && me ? (
                            <div className="absolute inset-0 flex flex-col bg-white">
                                <DIYChatWindow
                                    conversation={selectedConv}
                                    currentUserId={me.id}
                                    onBack={() => setSelectedId(null)}
                                />
                            </div>
                        ) : (
                            <div className="absolute inset-0 overflow-y-auto">
                                <div className="divide-y divide-zinc-100">
                                    {conversations.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-500">
                                            No messages yet.
                                        </div>
                                    ) : (
                                        conversations.map(conv => {
                                            const otherParticipant = conv.participants.find(p => p.user_id !== me?.id)
                                            const displayName = conv.type === 'direct'
                                                ? (otherParticipant?.full_name || 'Unknown User')
                                                : (conv.name || 'Group Chat')

                                            // Ensure type cast safety for avatar
                                            type ProfileResponseWithAvatar = { avatar_url?: string | null };
                                            const displayAvatar = (otherParticipant as unknown as ProfileResponseWithAvatar)?.avatar_url || null

                                            return (
                                                <button
                                                    key={conv.id}
                                                    onClick={() => setSelectedId(conv.id)}
                                                    className="w-full p-4 flex items-center gap-4 hover:bg-zinc-50 transition-colors text-left"
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-zinc-200 overflow-hidden shrink-0">
                                                        {displayAvatar ? (
                                                            <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-yellow-100 text-yellow-700 font-bold">
                                                                {displayName.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-baseline mb-1">
                                                            <h4 className="font-semibold text-zinc-900 truncate">{displayName}</h4>
                                                        </div>
                                                        <p className="text-sm text-zinc-500 truncate">
                                                            {conv.last_message ? conv.last_message.content : 'Started a new conversation'}
                                                        </p>
                                                    </div>
                                                    {conv.unread_count > 0 && (
                                                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                                                            <span className="text-white text-xs font-bold">{conv.unread_count}</span>
                                                        </div>
                                                    )}
                                                </button>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Transition>

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-200 ${isOpen ? 'bg-zinc-900 text-white rotate-90' : 'bg-yellow-400 text-zinc-900 hover:bg-yellow-300'
                    }`}
            >
                {isOpen ? (
                    <Cross2Icon className="w-6 h-6" />
                ) : (
                    <div className="relative">
                        <ChatBubbleIcon className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white px-1">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                )}
            </button>
        </div>
    )
}
