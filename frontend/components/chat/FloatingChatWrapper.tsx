'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getConversations, getMe } from '@/services/api'
import { ChatConversation, UserMeResponse } from '@/services/api.types'
import { ConversationList } from '@/app/(app)/messages/components/ConversationList'
import { StreamChatWindow } from '@/app/(app)/messages/components/StreamChatWindow'
import { useStreamChat } from '@/hooks/useStreamChat'
import { ChatBubbleIcon, Cross2Icon, SizeIcon } from '@radix-ui/react-icons'
import { Transition } from '@headlessui/react'

export function FloatingChatWrapper() {
    const [isOpen, setIsOpen] = useState(false)
    const [conversations, setConversations] = useState<ChatConversation[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [me, setMe] = useState<UserMeResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [unreadCount, setUnreadCount] = useState(0)

    // Initialize Stream Chat (shared client)
    const { client } = useStreamChat(me?.id);

    // Listen for new messages to update unread count
    useEffect(() => {
        if (!client) return;

        const updateCount = () => {
            // Type assertion to access total_unread_count
            const user = client.user as any;
            if (user?.total_unread_count !== undefined) {
                setUnreadCount(user.total_unread_count);
            }
        };

        const handleNewMessage = (event: any) => {
            // Check if the event carries the new unread count directly
            if (event.total_unread_count !== undefined) {
                setUnreadCount(event.total_unread_count);
            } else if (event.user?.total_unread_count !== undefined) {
                 setUnreadCount(event.user.total_unread_count);
            } else {
                 // Fallback: increment locally or fetch
                 updateCount();
            }
        };

        const handleNotification = () => {
            updateCount();
        };

        // Initial check
        updateCount();

        client.on('notification.message_new', handleNewMessage);
        client.on('notification.mark_read', handleNotification);
        // Also listen to general changes if needed

        return () => {
            client.off('notification.message_new', handleNewMessage);
            client.off('notification.mark_read', handleNotification);
        };
    }, [client]); // Removed isOpen dependency so we track background unread properly

    const router = useRouter()
    const pathname = usePathname()
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Load data when opened, but also load ME immediately to connect to chat
    useEffect(() => {
        // Load user immediately to establish connection
        if (!me) {
            getMe().then(setMe).catch(err => {
                // Silent fail if not logged in
                // console.log('Not logged in for chat'); 
            });
        }
    }, [])

    // Load full conversations when opened
    useEffect(() => {
        if (isOpen) {
            loadData()
        }
    }, [isOpen])

    // Reset selection when closed
    useEffect(() => {
        if (!isOpen) {
            setSelectedId(null)
        }
    }, [isOpen])

    // Initial check for unread (optional, can be done periodically)
    useEffect(() => {
        // Simple check: if we have a token, maybe fetch count? 
        // For now, we'll just load when opened.
        // If we want a badge, we'd need to fetch in background.
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [meData, convsData] = await Promise.all([
                getMe(),
                getConversations()
            ])
            setMe(meData)
            setConversations(convsData)

            // Check unread (Initial fallback from API)
            const totalUnread = convsData.reduce((acc, c) => acc + c.unread_count, 0)
            if (totalUnread > 0 && unreadCount === 0) {
                setUnreadCount(totalUnread)
            }
        } catch (error) {
            console.error('Failed to load chat data', error)
        } finally {
            setLoading(false)
        }
    }

    const refreshList = async () => {
        try {
            const data = await getConversations()
            setConversations(data)
            // We rely on client events for unread count mostly, but we can update here too
            const totalUnread = data.reduce((acc, c) => acc + c.unread_count, 0)
            const user = client?.user as any;
            if (user?.total_unread_count === undefined) {
                setUnreadCount(totalUnread)
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleExpand = () => {
        setIsOpen(false)
        router.push('/messages')
    }

    const selectedConv = conversations.find(c => c.id === selectedId)

    // Hide on messages page to avoid duplication
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
                            {selectedId ? 'Chat' : 'Messages'}
                        </h3>
                        <div className="flex items-center gap-2">
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
                                <div className="flex-1 overflow-hidden">
                                    <StreamChatWindow
                                        conversation={selectedConv}
                                        currentUserId={me.id}
                                        onMessageSent={refreshList}
                                        onBack={() => setSelectedId(null)}
                                        forceBackVisible={true}
                                        client={client}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 overflow-y-auto">
                                <ConversationList
                                    conversations={conversations}
                                    selectedId={null}
                                    currentUserId={me?.id || ''}
                                    onSelect={setSelectedId}
                                    loading={loading}
                                    client={client}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </Transition>

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-200 ${isOpen ? 'bg-zinc-900 text-white rotate-90' : 'bg-white text-zinc-900 hover:bg-zinc-50'
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
