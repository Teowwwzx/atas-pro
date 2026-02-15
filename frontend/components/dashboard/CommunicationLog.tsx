'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getConversationMessages, sendDataMessage, MessageResponse } from '@/services/api';
import { toast } from 'react-hot-toast';

interface CommunicationLogProps {
    conversationId: string | undefined;
    organizerName: string;
    currentUserEmail?: string; // or ID to differentiate sender
    currentUserId?: string;
}

export function CommunicationLog({ conversationId, organizerName, currentUserId }: CommunicationLogProps) {
    const [messages, setMessages] = useState<MessageResponse[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (conversationId) {
            fetchMessages();
            // Optional: Poll for new messages every 10s
            const interval = setInterval(fetchMessages, 10000);
            return () => clearInterval(interval);
        }
    }, [conversationId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        if (!conversationId) return;
        try {
            const data = await getConversationMessages(conversationId);
            // Reverse if API returns newest first, but chat router sorts by desc(created_at)
            // usually UI wants oldest at top.
            // backend sorts desc(created_at). So data[0] is newest.
            // We want to display: Oldest -> Newest (Top -> Bottom)
            setMessages([...data].reverse());
        } catch (error) {
            console.error('Failed to load messages', error);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !conversationId) return;
        setSending(true);
        try {
            await sendDataMessage(conversationId, newMessage);
            setNewMessage('');
            fetchMessages();
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!conversationId) {
        return (
            <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm flex flex-col h-[500px] items-center justify-center p-8 text-center bg-zinc-50/50">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <h4 className="font-bold text-zinc-900 mb-2">Chat Unavailable</h4>
                <p className="text-zinc-500 text-sm">
                    Unable to load conversation log.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-white z-10">
                <h3 className="font-bold text-zinc-900">Communication Log</h3>
                <span className="px-2 py-1 bg-zinc-100 text-zinc-500 text-xs font-bold rounded-md flex items-center gap-1">
                    🔒 Private
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                        <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <p className="text-sm text-zinc-500">Start the conversation with {organizerName}</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${isMe
                                        ? 'bg-zinc-800 text-white rounded-br-none'
                                        : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-none shadow-sm'
                                    }`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    <div className={`text-[11px] mt-1 ${isMe ? 'text-zinc-300' : 'text-zinc-500'} text-right`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-zinc-100 bg-white">
                <div className="flex items-end gap-2">
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-none max-h-32 min-h-[50px]"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={sending || !newMessage.trim()}
                        className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-bold p-3 rounded-xl transition-all"
                    >
                        <svg className="w-5 h-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
