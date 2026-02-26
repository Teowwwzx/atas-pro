import { useState } from 'react';

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
    const [isConnected] = useState(false);
    const [latestNotification] = useState<NotificationData | null>(null);

    // SSE has been decommissioned in favor of potential future WebSocket implementation
    // For now, this hook returns dummy data to not break the UI components relying on it.

    return {
        isConnected,
        latestNotification,
    };
}
