import { useState, useEffect, useCallback, useRef } from 'react';
import { getChatMessages, sendChatMessage } from '@/services/api';

export interface ChatMessage {
    id: string;
    content: string;
    sender_id: string;
    conversation_id: string;
    created_at: string;
    sender?: {
        full_name: string;
        avatar_url: string;
        id?: string;
    };
}

export function useChat(conversationId: string | null) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasFetchedHistoryRef = useRef<string | null>(null);

    // Initial load from REST API
    const loadHistory = useCallback(async (convId: string) => {
        try {
            setIsLoadingHistory(true);
            const response = await getChatMessages(convId);
            // Reverse so oldest is top, newest is bottom
            setMessages(response.reverse());
            hasFetchedHistoryRef.current = convId;
        } catch (error) {
            console.error('Failed to load chat history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    const connect = useCallback(() => {
        if (!conversationId) return;

        const token = localStorage.getItem('atas_token');
        if (!token) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const wsUrl = `${API_URL.replace('http', 'ws')}/api/v1/chat/ws/${conversationId}?token=${token}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Connected to chat via WebSocket');
            setIsConnected(true);

            // Fetch history only once per conversation when connecting
            if (hasFetchedHistoryRef.current !== conversationId) {
                loadHistory(conversationId);
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'chat_message') {
                    setMessages(prev => {
                        // Filter out duplicates (often happens if sent locally vs echo from server)
                        if (prev.find(m => m.id === data.data.id)) return prev;
                        return [...prev, data.data];
                    });
                }
            } catch (err) {
                console.error('Failed to parse websocket message', err);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
            setIsConnected(false);
            wsRef.current = null;
            // Reconnect
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            ws.close();
        };

        wsRef.current = ws;

    }, [conversationId, loadHistory]);

    useEffect(() => {
        // Reset state when switching conversations
        if (conversationId !== hasFetchedHistoryRef.current) {
            setMessages([]);
            hasFetchedHistoryRef.current = null;
        }

        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.onclose = null; // Prevent reconnect loop
                wsRef.current.close();
            }
        };
    }, [connect, conversationId]);

    const sendMessage = useCallback(async (content: string) => {
        if (!conversationId) return false;
        try {
            await sendChatMessage(conversationId, content);
            return true;
        } catch (error) {
            console.error('Failed to send message via REST API:', error);
            return false;
        }
    }, [conversationId]);

    return {
        messages,
        isConnected,
        isLoadingHistory,
        sendMessage
    };
}
