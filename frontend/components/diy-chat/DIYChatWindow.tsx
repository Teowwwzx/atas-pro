'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatConversation } from '@/services/api.types';

interface DIYChatWindowProps {
    conversation: ChatConversation;
    currentUserId: string;
    onMessageSent?: () => void;
    onBack?: () => void;
    forceBackVisible?: boolean;
    initialText?: string;
}

export function DIYChatWindow({
    conversation,
    currentUserId,
    onMessageSent,
    onBack,
    forceBackVisible = false,
    initialText = '',
}: DIYChatWindowProps) {
    const { messages, isConnected, isLoadingHistory, sendMessage } = useChat(conversation.id);
    const [inputValue, setInputValue] = useState(initialText);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Format participant info
    const otherParticipant = conversation.participants.find((p) => p.user_id !== currentUserId);
    let participantName = 'Unknown User';
    let participantAvatar = undefined;

    if (otherParticipant) {
        participantName = otherParticipant.full_name || 'Unknown User';
        participantAvatar = otherParticipant.avatar_url;
    } else if (conversation.participants.length > 0) {
        const first = conversation.participants[0];
        participantName = first.full_name || 'Unknown User';
        participantAvatar = first.avatar_url;
        if (first.user_id === currentUserId) {
            participantName = `${participantName} (You)`;
        }
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (!trimmed) return;

        const success = await sendMessage(trimmed);
        if (success) {
            setInputValue('');
            if (onMessageSent) onMessageSent();
        }
    };

    if (isLoadingHistory && messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-zinc-50/30">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-zinc-200 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-500 font-medium">Loading chat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white relative">
            {/* Connection Indicator Top Bar */}
            {!isConnected && (
                <div className="absolute top-0 left-0 right-0 z-10 bg-red-500 text-white text-[10px] text-center py-0.5 font-bold uppercase tracking-wider">
                    Disconnected - Trying to reconnect...
                </div>
            )}

            {/* Custom Header */}
            <div className={`p-4 md:p-6 border-b border-zinc-100 bg-white flex flex-shrink-0 items-center justify-between ${!isConnected ? 'pt-6' : ''}`}>
                <div className="flex items-center gap-3">
                    {/* Back button for mobile or forced */}
                    {onBack && (
                        <button
                            onClick={onBack}
                            className={`${forceBackVisible ? 'flex' : 'md:hidden flex'} w-10 h-10 items-center justify-center rounded-xl hover:bg-zinc-100 transition-colors`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden flex-shrink-0">
                        {participantAvatar ? (
                            <img src={participantAvatar} alt={participantName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
                                {participantName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Name */}
                    <div>
                        <h3 className="font-bold text-zinc-900">{participantName}</h3>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {isConnected ? 'Online' : 'Offline'}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <span className="hidden md:inline-flex px-2 py-1 bg-zinc-100 text-zinc-500 text-xs font-bold rounded-md items-center gap-1">
                        🔒 Private
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 flex flex-col">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 text-sm">
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-8 h-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p>No messages here yet.</p>
                        <p>Send a message to start the conversation.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender_id === currentUserId;
                        const showAvatar = !isMe && (idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id);

                        return (
                            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex max-w-[75%] gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar Column */}
                                    {!isMe && (
                                        <div className="flex-shrink-0 w-8 flex flex-col justify-end">
                                            {showAvatar && participantAvatar ? (
                                                <img src={participantAvatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-zinc-200" />
                                            ) : showAvatar ? (
                                                <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-500">
                                                    {participantName.charAt(0).toUpperCase()}
                                                </div>
                                            ) : null}
                                        </div>
                                    )}

                                    {/* Message Bubble */}
                                    <div className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-amber-400 text-black rounded-br-sm' : 'bg-white border border-zinc-200 text-zinc-900 rounded-bl-sm shadow-sm'}`}>
                                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                        <div className={`text-[10px] mt-1 ${isMe ? 'text-amber-900/60 text-right' : 'text-zinc-400'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-zinc-100 flex-shrink-0">
                <form onSubmit={handleSend} className="flex items-end gap-2 relative">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 border border-zinc-200 bg-zinc-50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent min-h-[50px] max-h-[120px]"
                        rows={1}
                        disabled={!isConnected}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || !isConnected}
                        className="h-[50px] w-[50px] flex items-center justify-center bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
