'use client';

import React, { useEffect, useState } from 'react';
import { Channel, Chat, MessageInput, MessageList, Thread, Window } from 'stream-chat-react';
import { useStreamChat } from '@/hooks/useStreamChat';
import type { Channel as StreamChannel } from 'stream-chat';
import 'stream-chat-react/dist/css/v2/index.css';
import '@/components/dashboard/stream-chat-custom.css';
import { ChatConversation } from '@/services/api.types';
import { ensureStreamConversation } from '@/services/api';

interface StreamChatWindowProps {
    conversation: ChatConversation;
    currentUserId: string;
    onMessageSent?: () => void;
    onBack?: () => void;
    forceBackVisible?: boolean;
}

export function StreamChatWindow({
    conversation,
    currentUserId,
    onMessageSent,
    onBack,
    forceBackVisible = false,
    client, // Accept client prop
    initialText, // New prop
}: StreamChatWindowProps & { client?: any, initialText?: string }) {
    // Debug logging for profile issue
    useEffect(() => {
        console.log('[StreamChatWindow] Debug:', {
            conversationId: conversation.id,
            currentUserId,
            participants: conversation.participants,
            otherParticipantFound: conversation.participants.find((p) => p.user_id !== currentUserId)
        });
    }, [conversation, currentUserId]);

    // Use passed client or internal hook (fallback)
    const internalHook = useStreamChat(currentUserId);
    const finalClient = client || internalHook.client;
    const loading = client ? false : internalHook.loading;
    const error = client ? null : internalHook.error;

    const [channel, setChannel] = useState<StreamChannel | null>(null);
    const [channelLoading, setChannelLoading] = useState(true);

    // Get other participant info
    const otherParticipant = conversation.participants.find((p) => p.user_id !== currentUserId);

    // Fallback logic: 
    // 1. If we found a specific "other" person, use them.
    // 2. If not, and there are participants, try to find one that isn't me (redundant check but safe).
    // 3. If still nothing (e.g. only me in list), show "Unknown User" instead of my own name.
    let participantName = 'Unknown User';
    let participantAvatar = undefined;

    if (otherParticipant) {
        participantName = otherParticipant.full_name || 'Unknown User';
        participantAvatar = otherParticipant.avatar_url;
    } else if (conversation.participants.length > 0) {
        // Fallback to first participant
        const first = conversation.participants[0];
        participantName = first.full_name || 'Unknown User';
        participantAvatar = first.avatar_url;

        // If it's the current user, maybe it's a self-chat?
        if (first.user_id === currentUserId) {
            // Only mark as "Note to Self" if there really are no other participants
            if (conversation.participants.length === 1 ||
                (conversation.participants.length === 2 && conversation.participants[1].user_id === currentUserId)) {
                participantName = `${participantName} (You)`;
            }
        }
    }

    useEffect(() => {
        if (!finalClient || !conversation.id) {
            setChannelLoading(false);
            return;
        }

        const initChannel = async () => {
            try {
                // Ensure client is connected
                if (!finalClient.userID) {
                    console.warn('[StreamChatWindow] Client not connected, skipping channel init');
                    setChannelLoading(false);
                    return;
                }

                setChannelLoading(true);

                let streamChannelId = conversation.id.startsWith('legacy_')
                    ? conversation.id
                    : `legacy_${conversation.id}`;

                try {
                    const ensureData = await ensureStreamConversation(conversation.id.replace('legacy_', ''));
                    // Use the authoritative channel ID from backend
                    if (ensureData && ensureData.channel_id) {
                        streamChannelId = ensureData.channel_id;
                    }
                } catch (e) {
                    console.warn('[StreamChatWindow] ensureStreamConversation failed, using default ID:', e instanceof Error ? e.message : e);
                }

                console.log('[StreamChatWindow] Initializing channel:', streamChannelId);

                // Get members from conversation participants
                const members = conversation.participants.map(p => p.user_id);

                // Get or create channel
                // We MUST specify members for private messaging channels
                const ch = finalClient.channel('messaging', streamChannelId, {
                    members: members,
                });

                await ch.watch();
                setChannel(ch);
                console.log('[StreamChatWindow] Channel ready:', streamChannelId);

                // Call onMessageSent when new message arrives (for updating unread counts)
                if (onMessageSent) {
                    ch.on('message.new', () => {
                        onMessageSent();
                    });
                }
            } catch (err) {
                console.error('[StreamChatWindow] Channel init error:', err);
            } finally {
                setChannelLoading(false);
            }
        };

        initChannel();

        return () => {
            // Cleanup
            if (channel) {
                // Ignore errors if client is already disconnected
                try {
                    channel.stopWatching().catch(() => { });
                } catch (e) {
                    // Ignore synchronous errors
                }
            }
        };
    }, [finalClient, conversation.id, onMessageSent]);

    // Handle initial text pre-fill
    useEffect(() => {
        if (channel && initialText) {
            // Locate the textarea and set value (Hack via DOM as Stream doesn't easily expose initialValue on standard component)
            const fillText = () => {
                const textarea = document.querySelector('.str-chat__textarea textarea') as HTMLTextAreaElement;
                if (textarea) {
                    // Only set if empty to avoid overwriting user typing if they navigated away and back? 
                    // Actually, if we just landed here, it should be empty.
                    if (!textarea.value) {
                        // Set value using native property setter to ensure React picks it up if it's controlled
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                        if (nativeInputValueSetter) {
                            nativeInputValueSetter.call(textarea, initialText);
                        } else {
                            textarea.value = initialText;
                        }

                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        textarea.focus();
                    }
                } else {
                    // Retry briefly if not rendered yet
                    setTimeout(fillText, 100);
                }
            };

            // Start trying to fill
            setTimeout(fillText, 100);
        }
    }, [channel, initialText]);

    // Loading state
    if (loading || channelLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-zinc-50/30">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-zinc-200 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-500 font-medium">Loading chat...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center bg-zinc-50/30 p-8">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h4 className="font-bold text-zinc-900 mb-2">Chat Unavailable</h4>
                    <p className="text-zinc-500 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    // No channel state
    if (!channel) {
        return (
            <div className="flex-1 flex items-center justify-center bg-zinc-50/30 p-8">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h4 className="font-bold text-zinc-900 mb-2">Unable to Load Chat</h4>
                    <p className="text-zinc-500 text-sm">This conversation could not be loaded.</p>
                </div>
            </div>
        );
    }

    // Main chat UI
    return (
        <div className="flex-1 flex flex-col h-full">
            <Chat client={finalClient!} theme="str-chat__theme-light">
                <Channel channel={channel}>
                    <div className="str-chat__channel h-full ">
                        <Window>
                            {/* Custom Header */}
                            <div className="p-4 md:p-6 border-b border-zinc-100 bg-white flex items-center justify-between">
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
                                        <p className="text-xs text-zinc-500">Active chat</p>
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
                            <MessageList />

                            {/* Input */}
                            <MessageInput />
                        </Window>
                        <Thread />
                    </div>
                </Channel>
            </Chat>
        </div>
    );
}
