import asyncio
import json
import logging
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import WebSocket

from app.core.redis import async_redis_client

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Manages WebSocket connections and Redis Pub/Sub for real-time chat.
    This solves the exact problem GetStream solves: persistent, fan-out messaging across multiple server workers.
    """
    def __init__(self):
        # Maps channel_id -> List of active WebSockets in this specific worker process
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Keep track of Redis pubsub tasks so we can cleanly cancel them
        self.pubsub_tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, channel_id: str, user_id: str):
        """Accept a new WebSocket connection and subscribe to the Redis channel if needed."""
        await websocket.accept()
        
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = []
            # First connection to this channel on this worker -> Start listening to Redis
            task = asyncio.create_task(self._listen_to_redis(channel_id))
            self.pubsub_tasks[channel_id] = task
            
        self.active_connections[channel_id].append(websocket)
        logger.info(f"User {user_id} connected to channel {channel_id}. Total connected: {len(self.active_connections[channel_id])}")

    def disconnect(self, websocket: WebSocket, channel_id: str):
        """Remove a WebSocket connection."""
        if channel_id in self.active_connections:
            if websocket in self.active_connections[channel_id]:
                self.active_connections[channel_id].remove(websocket)
            
            # If no one is left in this channel on this worker, stop listening to Redis
            if not self.active_connections[channel_id]:
                del self.active_connections[channel_id]
                if channel_id in self.pubsub_tasks:
                    self.pubsub_tasks[channel_id].cancel()
                    del self.pubsub_tasks[channel_id]

    async def broadcast_to_channel(self, channel_id: str, message: dict):
        """
        Publish a message to Redis. 
        We do NOT send directly to websockets here. We send to Redis, and the _listen_to_redis 
        task will pick it up and send to the websockets. This ensures all workers get the message.
        """
        redis_channel = f"chat_channel_{channel_id}"
        await async_redis_client.publish(redis_channel, json.dumps(message))

    async def _listen_to_redis(self, channel_id: str):
        """
        Runs in the background for each active channel. 
        Listens for messages from Redis and pushes them to all connected local WebSockets.
        """
        redis_channel = f"chat_channel_{channel_id}"
        pubsub = async_redis_client.pubsub()
        await pubsub.subscribe(redis_channel)
        
        logger.info(f"Subscribed to Redis channel: {redis_channel}")
        
        try:
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    data = json.loads(message['data'])
                    
                    # Fan-out to all local connections for this channel
                    connections = self.active_connections.get(channel_id, [])
                    dead_connections = []
                    
                    for connection in connections:
                        try:
                            await connection.send_json(data)
                        except Exception as e:
                            logger.error(f"Error sending to websocket: {str(e)}")
                            dead_connections.append(connection)
                            
                    # Cleanup dead connections
                    for dead in dead_connections:
                        self.disconnect(dead, channel_id)
        except asyncio.CancelledError:
            logger.info(f"Unsubscribing from Redis channel: {redis_channel}")
            await pubsub.unsubscribe(redis_channel)
        except Exception as e:
            logger.error(f"Redis pubsub error for channel {channel_id}: {str(e)}")

# Global instance
manager = ConnectionManager()
