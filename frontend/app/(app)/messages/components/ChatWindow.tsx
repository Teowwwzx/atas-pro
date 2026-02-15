
import React, { useEffect, useRef, useState } from 'react'
import { ChatConversation, ChatMessage } from '@/services/api.types'
import { getChatMessages, sendChatMessage } from '@/services/api'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

interface ChatWindowProps {
    conversation: ChatConversation
    currentUserId: string
    onMessageSent?: () => void
    onBack?: () => void
}

export function ChatWindow({ conversation, currentUserId, onMessageSent, onBack }: ChatWindowProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [inputText, setInputText] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)

    // Identify Other Participant
    const other = conversation.participants.find(p => p.user_id !== currentUserId)
    const otherName = other?.full_name || 'Unknown'
    const otherAvatar = other?.avatar_url || `https://placehold.co/200x200/png?text=${encodeURIComponent(otherName)}`

    const fetchMessages = async () => {
        try {
            const data = await getChatMessages(conversation.id)
            setMessages(data.reverse()) // API returns desc, we want asc for display usually or handle reverse list
        } catch (error) {
            console.error(error)
            toast.error('Failed to load messages')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setLoading(true)
        fetchMessages()
        // Poll for new messages every 10s (Basic MVP)
        const interval = setInterval(fetchMessages, 10000)
        return () => clearInterval(interval)
    }, [conversation.id])

    useEffect(() => {
        // Scroll to bottom on load/new message
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, loading])

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!inputText.trim() || sending) return

        const tempText = inputText
        setInputText('')
        setSending(true)

        try {
            const newMsg = await sendChatMessage(conversation.id, tempText)
            setMessages(prev => [...prev, newMsg])
            onMessageSent?.()
        } catch (error) {
            console.error(error)
            toast.error('Failed to send message')
            setInputText(tempText) // Restore text
        } finally {
            setSending(false)
        }
    }

    // Hande Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                    {/* Mobile Back Button */}
                    <button onClick={onBack} className="md:hidden text-zinc-500 hover:text-zinc-900">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <img src={otherAvatar} alt={otherName} className="w-10 h-10 rounded-full bg-zinc-100 object-cover" />
                    <div>
                        <h3 className="font-bold text-zinc-900 text-sm">{otherName}</h3>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 block"></span>
                            Online
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
                {loading ? (
                    <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-20 text-zinc-400 text-sm">
                        <p>No messages yet.</p>
                        <p>Say hello to {otherName}!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender_id === currentUserId
                        const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id

                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {!isMe && (
                                    <div className="w-8 shrink-0">
                                        {showAvatar && <img src={otherAvatar} className="w-8 h-8 rounded-full object-cover" />}
                                    </div>
                                )}
                                <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end flex flex-col' : 'items-start flex flex-col'}`}>
                                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isMe
                                            ? 'bg-zinc-900 text-white rounded-br-none'
                                            : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-none shadow-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                    <span className="text-[10px] text-zinc-400 px-1">
                                        {format(new Date(msg.created_at), 'h:mm a')}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-zinc-100 bg-white">
                <form onSubmit={handleSend} className="flex gap-2 relative">
                    <input
                        className="flex-1 bg-zinc-100 border-0 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all font-medium placeholder:text-zinc-400"
                        placeholder="Type a message..."
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || sending}
                        className="p-3 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-400 text-amber-950 rounded-xl transition-all shadow-sm font-bold"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    )
}
