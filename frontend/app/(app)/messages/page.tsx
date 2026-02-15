
'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { getConversations, getMe } from '@/services/api'
import { ChatConversation, UserMeResponse } from '@/services/api.types'
import { ConversationList } from './components/ConversationList'
import { StreamChatWindow } from './components/StreamChatWindow'
import { useStreamChat } from '@/hooks/useStreamChat'
import { toast } from 'react-hot-toast'
import { useSearchParams } from 'next/navigation'

function MessagesContent() {
    const [conversations, setConversations] = useState<ChatConversation[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [me, setMe] = useState<UserMeResponse | null>(null)
    const [loading, setLoading] = useState(true)

    // Check if redirecting from profile with ?conversation_id=...
    const searchParams = useSearchParams()
    const initialConvId = searchParams.get('conversation_id')
    const initialText = searchParams.get('initial_text')

    // Initialize Stream Chat (shared client)
    const { client } = useStreamChat(me?.id);

    useEffect(() => {
        const init = async () => {
            try {
                const [meData, convsData] = await Promise.all([
                    getMe(),
                    getConversations()
                ])
                setMe(meData)
                setConversations(convsData)

                // Auto select if provided in URL or if desktop and have convs
                if (initialConvId) {
                    setSelectedId(initialConvId)
                } else if (window.innerWidth >= 768 && convsData.length > 0) {
                    setSelectedId(convsData[0].id)
                }
            } catch (error) {
                console.error(error)
                toast.error('Failed to load messages')
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [])

    // Refresh conversations list (e.g. to update unread counts or last msg)
    const refreshList = async () => {
        try {
            const data = await getConversations()
            setConversations(data)
        } catch (error) {
            console.error(error)
        }
    }

    // Note: Polling removed - GetStream provides real-time updates via WebSocket
    // The conversation list is updated via onMessageSent callback

    const selectedConv = conversations.find(c => c.id === selectedId)

    return (
        <div className="h-[calc(100vh-80px)] w-full mx-auto p-2 md:p-4 lg:p-6 animate-fadeIn">
            <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden h-full flex max-w-screen-2xl mx-auto">

                {/* Sidebar / List */}
                <div className={`w-full md:w-80 lg:w-96 xl:w-[400px] flex-shrink-0 border-r border-zinc-100 flex flex-col ${selectedId ? 'hidden md:flex' : 'flex'}`}>
                    {/* <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight">Messages</h2>
                        <button className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
                            + New Chat
                        </button>
                    </div> */}

                    <div className="p-3 border-b border-zinc-100 bg-white">
                        <input
                            placeholder="Search messages..."
                            className="text-gray-700 w-full bg-zinc-100 border-none rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-amber-400"
                        />
                    </div>

                    <ConversationList
                        conversations={conversations}
                        selectedId={selectedId}
                        currentUserId={me?.id || ''}
                        onSelect={setSelectedId}
                        loading={loading}
                        client={client} // Pass client
                    />
                </div>

                {/* Chat Window */}
                <div className={`flex-1 flex flex-col ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
                    {selectedConv && me ? (
                        <StreamChatWindow
                            conversation={selectedConv}
                            currentUserId={me.id}
                            onMessageSent={refreshList}
                            onBack={() => setSelectedId(null)}
                            client={client} // Pass client
                            initialText={initialText || undefined}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/30 text-zinc-400 p-8 text-center">
                            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-10 h-10 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900 mb-2">Your Messages</h3>
                            <p className="max-w-xs">Select a conversation from the list to start chatting or start a new conversation from a user profile.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
            <MessagesContent />
        </Suspense>
    )
}
