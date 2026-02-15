
import React from 'react'
import { ChatConversation } from '@/services/api.types'
import { format } from 'date-fns'
import { ChannelList, Chat, ChannelPreviewUIComponentProps } from 'stream-chat-react'
import { CustomChannelPreview } from './CustomChannelPreview'
import type { StreamChat } from 'stream-chat'

interface ConversationListProps {
    conversations: ChatConversation[]
    selectedId: string | null
    currentUserId: string
    onSelect: (id: string) => void
    loading?: boolean
    client?: StreamChat | null
}

export function ConversationList({ conversations, selectedId, currentUserId, onSelect, loading, client }: ConversationListProps) {
    if (loading) {
        return (
            <div className="space-y-4 p-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-12 h-12 bg-zinc-200 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-zinc-200 rounded w-3/4" />
                            <div className="h-3 bg-zinc-200 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    // Use Stream Chat List if client is available
    if (client) {
        const filters = { type: 'messaging', members: { $in: [currentUserId] } };
        const sort = { last_message_at: -1 as const };
        const options = { limit: 20 };

        const PreviewWrapper = (props: ChannelPreviewUIComponentProps) => (
            <CustomChannelPreview 
                {...props} 
                onSelect={() => {
                    // Extract raw UUID from channel ID (e.g. legacy_UUID -> UUID)
                    const rawId = props.channel?.id ? props.channel.id.replace('legacy_', '') : '';
                    if (rawId) {
                        onSelect(rawId);
                    }
                }} 
            />
        );

        return (
            <div className="h-full stream-chat-list-wrapper">
                <Chat client={client} theme="str-chat__theme-light">
                    <ChannelList 
                        filters={filters}
                        sort={sort}
                        options={options}
                        Preview={PreviewWrapper}
                        showChannelSearch={false}
                    />
                </Chat>
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="p-8 text-center text-zinc-400 text-sm">
                No conversations yet. Start chatting with people from their profiles!
            </div>
        )
    }

    return (
        <div className="overflow-y-auto h-full">
            {conversations.map(conv => {
                // Find other participant
                const other = conv.participants.find(p => p.user_id !== currentUserId)
                const name = other?.full_name || 'Unknown User'
                const avatar = other?.avatar_url || `https://placehold.co/200x200/png?text=${encodeURIComponent(name)}`
                const isSelected = selectedId === conv.id

                return (
                    <div
                        key={conv.id}
                        onClick={() => onSelect(conv.id)}
                        className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-50 transition-colors border-b border-zinc-50 ${isSelected ? 'bg-zinc-50 border-r-4 border-r-amber-400' : ''}`}
                    >
                        <div className="relative">
                            <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover border border-zinc-200" />
                            {conv.unread_count > 0 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                                    {conv.unread_count}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <h4 className={`font-bold text-sm truncate ${conv.unread_count > 0 ? 'text-zinc-900' : 'text-zinc-700'}`}>
                                    {name}
                                </h4>
                                {conv.last_message && (
                                    <span className="text-xs text-zinc-400 whitespace-nowrap ml-2">
                                        {format(new Date(conv.last_message.created_at), 'MMM d')}
                                    </span>
                                )}
                            </div>
                            <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-zinc-900 font-semibold' : 'text-zinc-500'}`}>
                                {conv.last_message?.content || 'No messages yet'}
                            </p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
