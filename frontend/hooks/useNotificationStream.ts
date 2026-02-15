import { useEffect, useRef, useState } from 'react';

interface NotificationData {
    id: string;
    recipient_id: string;
    actor_id: string;
    type: string;
    title?: string;
    content: string;
    message?: string;
    link_url?: string | null;
    is_read: boolean;
    created_at: string;
    updated_at?: string | null;
}

export function useNotificationStream() {
    const [isConnected, setIsConnected] = useState(false);
    const [latestNotification, setLatestNotification] = useState<NotificationData | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        // Simple cookie check without libraries
        const getAccessToken = () => {
            if (typeof window === 'undefined') return null;
            return localStorage.getItem('atas_token');
        };

        let eventSource: EventSource | null = null;
        let retryTimeout: NodeJS.Timeout;

        const connectSSE = () => {
            const token = getAccessToken();

            if (!token) {
                console.log('No access token, skipping SSE connection');
                // Retry in 2 seconds (in case login just happened)
                retryTimeout = setTimeout(connectSSE, 2000);
                return;
            }

            // Avoid double connection
            if (eventSourceRef.current?.readyState === EventSource.OPEN) {
                return;
            }

            // Create EventSource connection
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const url = `${API_URL}/api/v1/notifications/stream?token=${token}`;

            try {
                const es = new EventSource(url, { withCredentials: true });

                es.onopen = () => {
                    console.log('SSE connection established');
                    setIsConnected(true);
                };

                es.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === 'connected') {
                            console.log('SSE stream confirmed:', data.message);
                        } else {
                            // It's a real notification
                            console.log('Received notification via SSE:', data);
                            setLatestNotification(data);
                        }
                    } catch (err) {
                        console.error('Failed to parse SSE message:', err);
                    }
                };

                es.onerror = (error) => {
                    console.error('SSE error:', error);
                    setIsConnected(false);
                    es.close();
                    eventSourceRef.current = null;

                    // Retry connection after 5 seconds
                    retryTimeout = setTimeout(() => {
                        console.log('Attempting to reconnect SSE...');
                        connectSSE();
                    }, 5000);
                };

                eventSourceRef.current = es;
                eventSource = es;
            } catch (err) {
                console.error('Failed to create EventSource:', err);
                retryTimeout = setTimeout(connectSSE, 5000);
            }
        };

        connectSSE();

        // Cleanup on unmount
        return () => {
            if (retryTimeout) clearTimeout(retryTimeout);
            if (eventSourceRef.current) {
                console.log('Closing SSE connection');
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []); // Run once, but internal logic handles retries/token checks

    return {
        isConnected,
        latestNotification,
    };
}
