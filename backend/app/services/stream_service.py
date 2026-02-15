"""
GetStream Chat Service
Handles all GetStream Chat API interactions
"""

from stream_chat import StreamChat
from app.core.config import settings
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


class StreamChatService:
    """Service layer for GetStream Chat SDK"""
    
    def __init__(self):
        """Initialize StreamChat client with API credentials"""
        if not settings.GET_STREAM_API_KEY or not settings.GET_STREAM_SECRET_KEY:
            logger.warning("GetStream credentials not configured. Chat features may not work.")
            self._client = None
        else:
            self._client = StreamChat(
                api_key=settings.GET_STREAM_API_KEY,
                api_secret=settings.GET_STREAM_SECRET_KEY
            )
            logger.info("StreamChat client initialized successfully")
    
    @property
    def client(self) -> StreamChat:
        """Get the StreamChat client instance"""
        if not self._client:
            raise RuntimeError("GetStream client not initialized. Check API credentials.")
        return self._client
    
    def create_user_token(self, user_id: str, exp: Optional[int] = None) -> str:
        """
        Generate authentication token for a user
        
        Args:
            user_id: Unique user identifier (UUID as string)
            exp: Optional expiration time in seconds
            
        Returns:
            JWT token string for client-side authentication
        """
        try:
            token = self.client.create_token(user_id, exp=exp)
            logger.info(f"Generated token for user: {user_id}")
            return token
        except Exception as e:
            logger.error(f"Failed to create token for user {user_id}: {str(e)}")
            raise
    
    def upsert_user(self, user_id: str, name: str, image: Optional[str] = None, **extra_data) -> dict:
        """
        Create or update user in GetStream
        
        Args:
            user_id: Unique user identifier
            name: User's display name
            image: Optional avatar URL
            **extra_data: Additional custom user data
            
        Returns:
            User creation/update response
        """
        try:
            user_data = {
                "id": user_id,
                "name": name,
            }
            
            if image:
                user_data["image"] = image
            
            # Merge any extra data
            user_data.update(extra_data)
            
            response = self.client.upsert_user(user_data)
            logger.info(f"Upserted user: {user_id}")
            return response
        except Exception as e:
            logger.error(f"Failed to upsert user {user_id}: {str(e)}")
            raise
    
    def get_or_create_channel(
        self, 
        channel_type: str, 
        channel_id: str, 
        created_by_id: str,
        members: List[str], 
        name: Optional[str] = None,
        **custom_data
    ) -> str:
        """
        Get existing channel or create new one
        
        Args:
            channel_type: Type of channel (e.g., 'messaging', 'team')
            channel_id: Unique channel identifier
            created_by_id: User ID who creates the channel
            members: List of member user IDs
            name: Optional channel name
            **custom_data: Additional channel metadata
            
        Returns:
            Channel ID
        """
        try:
            # Prepare channel data (members, optional name, and custom fields)
            channel_data = {"members": members}
            if name:
                channel_data["name"] = name
            channel_data.update(custom_data)

            # Initialize channel with explicit id and data
            channel = self.client.channel(channel_type, channel_id, channel_data)
            
            # Try to create, will succeed if doesn't exist
            try:
                # Python SDK expects the creator user_id as the first positional arg
                channel.create(created_by_id)
                logger.info(f"Created new channel: {channel_type}:{channel_id}")
            except Exception as create_error:
                # Channel likely already exists, just watch it
                if "already exists" in str(create_error).lower():
                    logger.info(f"Channel already exists: {channel_type}:{channel_id}")
                else:
                    raise
            
            return channel_id
        except Exception as e:
            logger.error(f"Failed to get/create channel {channel_id}: {str(e)}")
            raise
    
    def get_or_create_dm(self, user1_id: str, user2_id: str) -> str:
        """
        Get or create 1-on-1 direct message channel
        
        Args:
            user1_id: First user ID
            user2_id: Second user ID
            
        Returns:
            Channel ID for the DM
        """
        # Sort IDs to ensure consistent channel naming
        members = sorted([user1_id, user2_id])
        channel_id = f"dm_{members[0]}_{members[1]}"
        
        try:
            return self.get_or_create_channel(
                channel_type="messaging",
                channel_id=channel_id,
                created_by_id=user1_id,
                members=members
            )
        except Exception as e:
            logger.error(f"Failed to create DM between {user1_id} and {user2_id}: {str(e)}")
            raise
    
    def send_message(
        self, 
        channel_type: str, 
        channel_id: str, 
        user_id: str, 
        text: str,
        **custom_data
    ) -> dict:
        """
        Send a message to a channel
        
        Args:
            channel_type: Type of channel
            channel_id: Channel identifier
            user_id: Sender user ID
            text: Message content
            **custom_data: Additional message data
            
        Returns:
            Message send response
        """
        try:
            channel = self.client.channel(channel_type, channel_id)
            
            message_data = {"text": text}
            message_data.update(custom_data)
            
            response = channel.send_message(message_data, user_id)
            logger.info(f"Message sent to {channel_type}:{channel_id} by {user_id}")
            return response
        except Exception as e:
            logger.error(f"Failed to send message: {str(e)}")
            raise


# Singleton instance
_stream_service_instance = None

def get_stream_service() -> StreamChatService:
    """Get or create StreamChatService singleton instance"""
    global _stream_service_instance
    if _stream_service_instance is None:
        _stream_service_instance = StreamChatService()
    return _stream_service_instance
