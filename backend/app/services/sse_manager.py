import asyncio
import uuid
from typing import Dict, Optional
from app.models.notification_model import Notification
from app.schemas.notification_schema import NotificationResponse
import logging

logger = logging.getLogger(__name__)

class SSEConnectionManager:
    """Manages Server-Sent Events connections for real-time notifications"""
    
    def __init__(self):
        # Maps user_id to their asyncio.Queue for notifications
        self.connections: Dict[uuid.UUID, asyncio.Queue] = {}
    
    async def connect(self, user_id: uuid.UUID) -> asyncio.Queue:
        """Register a new SSE connection for a user"""
        queue = asyncio.Queue()
        self.connections[user_id] = queue
        logger.info(f"SSE connection established for user {user_id}")
        return queue
    
    def disconnect(self, user_id: uuid.UUID):
        """Remove a user's SSE connection"""
        if user_id in self.connections:
            del self.connections[user_id]
            logger.info(f"SSE connection closed for user {user_id}")
    
    async def send_to_user(self, user_id: uuid.UUID, notification: Notification):
        """Send a notification to a specific user if they're connected"""
        if user_id in self.connections:
            try:
                # Convert to response schema for JSON serialization
                notif_data = NotificationResponse.model_validate(notification)
                await self.connections[user_id].put(notif_data.model_dump(mode='json'))
                logger.debug(f"Notification sent to user {user_id} via SSE")
            except Exception as e:
                logger.error(f"Error sending notification to user {user_id}: {e}")
    
    def is_connected(self, user_id: uuid.UUID) -> bool:
        """Check if a user has an active SSE connection"""
        return user_id in self.connections

    async def broadcast_shutdown(self):
        """Notify all connected clients that the server is shutting down"""
        logger.info("Broadcasting shutdown to all SSE connections")
        shutdown_msg = {"type": "shutdown", "message": "Server shutting down"}
        
        # Create a list of futures to ensure we don't block sequentially too long
        tasks = []
        for user_id, queue in list(self.connections.items()):
            try:
                tasks.append(queue.put(shutdown_msg))
            except Exception:
                pass
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


# Global SSE manager instance
sse_manager = SSEConnectionManager()
