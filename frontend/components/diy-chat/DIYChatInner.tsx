'use client'

import React, { useEffect, useState, useRef } from 'react'
import { ChatConversation, UserMeResponse, ChatMessage } from '@/services/api.types'
import { getDIYMessages } from '@/services/api'
import { useChat } from '@/hooks/useChat'
import { PaperPlaneIcon } from '@radix-ui/react-icons'

interface DIYChatInnerProps {
    channel: ChatConversation
    currentUser: UserMeResponse
}

export function DIYChatInner({ channel, currentUser }: DIYChatInnerProps) {
    const [inputValue, setInputValue] = useState('')
    const [isLoadingHistory, setIsLoadingHistory] = useState(true)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Using the custom WebSocket hook
    // We assume the token might be required later, but for MVP we rely on cookie/auth standard behavior if possible,
    // or we might need to pass `localStorage.getItem('atas_token')` to useChat. Let's pass it.
    const token = typeof window !== 'undefined' ? localStorage.getItem('atas_token') || undefined : undefined

    const {
        messages,
        setMessages,
        isConnected,
        isReconnecting,
        sendMessage
    } = useChat({
        conversationId: channel.id,
        token
    })

    // Load initial REST history
    useEffect(() => {
        setIsLoadingHistory(true)
        getDIYMessages(channel.id, 0, 50)
            .then(data => {
                // The hook maintains `messages`. We initialize it with history.
                // Reversing because the backend returns newest first when querying history directly with offset
                setMessages(data) // The backend already does list(reversed()) so chronologically correct
            })
            .catch(console.error)
            .finally(() => setIsLoadingHistory(false))
    }, [channel.id])

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim() || !isConnected) return

        // Send via WebSocket hook
        sendMessage(inputValue.trim())

        // Optimistic UI update (optional, backend will echo it back, but echoing makes it feel instant)
        // Actually, since Redis Pub/Sub broadcasts to all, the sender will ALSO receive the message.
        // So we don't need to add it optimistically or we might get duplicates, unless we deduplicate by ID.
        // For now, let's rely on the WebSocket echo to avoid complex optimistic logic.

        setInputValue('')
    }

    return (
        <div className="flex flex-col h-full bg-zinc-50 relative">
            {/* Connection Status Indicator */}
            {!isConnected && !isReconnecting && (
                <div className="bg-red-500 text-white text-xs text-center py-1">Disconnected</div>
            )}
            {isReconnecting && (
                <div className="bg-yellow-500 text-white text-xs text-center py-1">Reconnecting...</div>
            )}

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingHistory ? (
                    <div className="flex justify-center py-8">
                        <div className="w-6 h-6 border-2 border-zinc-300 border-t-yellow-400 rounded-full animate-spin"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-zinc-500 text-sm py-8">
                        No messages yet. Say hi!
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender_id === currentUser.id
                        return (
                            <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMe
                                        ? 'bg-yellow-400 text-zinc-900 rounded-br-sm'
                                        : 'bg-white border text-zinc-800 rounded-bl-sm shadow-sm'
                                    }`}>
                                    {!isMe && msg.sender_name && (
                                        <div className="text-[10px] text-zinc-500 mb-1">{msg.sender_name}</div>
                                    )}
                                    <div className="text-sm break-words whitespace-pre-wrap">{msg.content}</div>
                                </div>
                                <span className="text-[10px] text-zinc-400 mt-1">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t flex gap-2 items-center">
                <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-zinc-100 border-transparent focus:bg-white focus:border-yellow-400 focus:ring-0 rounded-full px-4 py-2 text-sm transition-all outline-none"
                    disabled={!isConnected}
                />
                <button
                    type="submit"
                    disabled={!inputValue.trim() || !isConnected}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900 text-yellow-400 disabled:opacity-50 disabled:bg-zinc-200 disabled:text-zinc-400 transition-colors"
                >
                    <PaperPlaneIcon className="w-5 h-5 ml-0.5" />
                </button>
            </form>
        </div>
    )
}
