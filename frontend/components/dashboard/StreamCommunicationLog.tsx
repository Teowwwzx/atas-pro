'use client';

import React, { useEffect, useState } from 'react';
import {
    Channel,
    MessageInput,
    MessageList,
    Thread,
    Window,
    Chat,
} from 'stream-chat-react';
import { useStreamChat } from '@/hooks/useStreamChat';
import type { Channel as StreamChannel } from 'stream-chat';
import 'stream-chat-react/dist/css/v2/index.css';
import './stream-chat-custom.css'; // We'll create custom styles
import { ensureStreamConversation } from '@/services/api';

interface StreamCommunicationLogProps {
    conversationId: string | undefined;
    currentUserId?: string;
    organizerName: string;
}

export function StreamCommunicationLog({
    conversationId,
    currentUserId,
    organizerName,
}: StreamCommunicationLogProps) {
    const { client, loading, error } = useStreamChat(currentUserId);
    const [channel, setChannel] = useState<StreamChannel | null>(null);
    const [channelLoading, setChannelLoading] = useState(true);

    useEffect(() => {
        if (!client || !conversationId || !currentUserId) {
            setChannelLoading(false);
            return;
        }

        const initChannel = async () => {
            try {
                setChannelLoading(true);

                const rawConvId = conversationId.startsWith('legacy_')
                    ? conversationId.replace('legacy_', '')
                    : conversationId;
                await ensureStreamConversation(rawConvId);

                // Create channel ID from conversation
                const channelId = conversationId.startsWith('legacy_')
                    ? conversationId
                    : `legacy_${conversationId}`;

                const ch = client.channel('messaging', channelId);

                await ch.watch();
                setChannel(ch);
                console.log('[StreamChat] Channel initialized:', channelId);
            } catch (err) {
                console.error('[StreamChat] Channel init error:', err);
            } finally {
                setChannelLoading(false);
            }
        };

        initChannel();

        return () => {
            // Cleanup: stop watching channel
            if (channel) {
                channel.stopWatching().catch(e => console.error('Stop watching error:', e));
            }
        };
    }, [client, conversationId, currentUserId]);

    // Loading state
    if (loading || channelLoading) {
        return (
            <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm flex flex-col h-[600px] items-center justify-center">
                <div className="w-12 h-12 border-4 border-zinc-200 border-t-yellow-400 rounded-full animate-spin"></div>
                <p className="text-zinc-500 mt-4 font-medium">Loading chat...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm flex flex-col h-[600px] items-center justify-center p-8">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h4 className="font-bold text-zinc-900 mb-2">Chat Unavailable</h4>
                <p className="text-zinc-500 text-sm">{error}</p>
            </div>
        );
    }

    // No conversation state
    if (!conversationId || !client || !channel) {
        return (
            <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm flex flex-col h-[600px] items-center justify-center p-8 text-center bg-zinc-50/50">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <h4 className="font-bold text-zinc-900 mb-2">Chat Unavailable</h4>
                <p className="text-zinc-500 text-sm">
                    Start the conversation with {organizerName}
                </p>
            </div>
        );
    }

    // Main chat UI
    return (
        <div className="stream-chat-wrapper bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden h-[600px]">
            <Chat client={client} theme="str-chat__theme-light">
                <Channel channel={channel}>
                    <Window>
                        <div className="stream-chat-header p-6 border-b border-zinc-100 flex items-center justify-between bg-white">
                            <h3 className="font-bold text-zinc-900">Communication Log</h3>
                            <span className="px-2 py-1 bg-zinc-100 text-zinc-500 text-xs font-bold rounded-md flex items-center gap-1">
                                🔒 Private
                            </span>
                        </div>
                        <MessageList />
                        <MessageInput />
                    </Window>
                    <Thread />
                </Channel>
            </Chat>
        </div>
    );
}
