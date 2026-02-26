import { useState, useEffect, useCallback, useRef } from 'react';

// Defines the structure of a chat message returned by the backend
export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
    sender_name?: string | null;
    sender_avatar?: string | null;
    type?: 'new_message' | 'system';
}

interface UseChatProps {
    conversationId: string | null;
    token?: string; // Optional JWT token for auth
}

export function useChat({ conversationId, token }: UseChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (!conversationId) return;

        // Clear any existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        // Connect to WebSocket
        // We assume the backend runs on port 8000 for local chat dev (or dynamically from env)
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        // Convert http to ws
        const wsUrl = backendUrl.replace(/^http/, 'ws');

        // Construct the full WebSocket URL
        let url = `${wsUrl}/api/v1/chat/ws/${conversationId}`;
        if (token) {
            url += `?token=${encodeURIComponent(token)}`;
        }

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                setIsReconnecting(false);
                setError(null);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'new_message') {
                        // Transform the Redis payload into our local Message format
                        // In a full implementation, the backend should send full MessageResponse schemas
                        const newMsg: Message = {
                            id: crypto.randomUUID(), // Temporary ID until backend assigns one properly in its payload
                            conversation_id: data.conversation_id,
                            sender_id: data.sender_id,
                            content: data.content,
                            is_read: false,
                            created_at: new Date().toISOString(),
                            sender_name: data.sender_name || 'Unknown',
                            type: 'new_message'
                        };

                        setMessages(prev => [...prev, newMsg]);
                    }
                } catch (err) {
                    console.error('Failed to parse websocket message', err);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                // Attempt auto-reconnect if we didn't explicitly clear the conversation ID
                if (conversationId) {
                    setIsReconnecting(true);
                    reconnectTimeoutRef.current = setTimeout(connect, 3000); // Retry after 3 seconds
                }
            };

            ws.onerror = (ev: Event) => {
                console.error('WebSocket Error', ev);
                setError('Failed to connect to chat server');
                // onclose will be triggered immediately after onerror
            };

        } catch (err: any) {
            setError(err.message || 'Failed to establish connection');
        }
    }, [conversationId, token]);

    // Initial connection
    useEffect(() => {
        connect();

        return () => {
            // Cleanup
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    // Send message function
    const sendMessage = useCallback((content: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // For MVP, we pass pure text. The backend will parse it or accept it directly as text.
            // Wait, in chat_router.py: data = await websocket.receive_text()
            // So we just send raw text.
            wsRef.current.send(content);
        } else {
            setError("Cannot send message. Disconnected.");
        }
    }, []);

    return {
        messages,
        setMessages, // Useful for pre-filling with REST API initial load
        isConnected,
        isReconnecting,
        error,
        sendMessage
    };
}
