import sys
import os
import redis

# Add backend directory to path so we can import app config if needed
# But for a simple flush, we might just want to connect directly to localhost:6379
# since we are running this script from the host machine.

def clear_cache():
    """
    Clears the Redis cache.
    Connects to localhost:6379 by default (assuming running from host with Docker port mapping).
    """
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    print(f"🔌 Connecting to Redis at {redis_url}...")
    
    try:
        r = redis.from_url(redis_url, decode_responses=True)
        r.ping() # Check connection
        
        print("🧹 Flushing all keys...")
        r.flushall()
        print("✅ Redis cache cleared successfully!")
        
    except redis.exceptions.ConnectionError:
        print("❌ Could not connect to Redis. Is Docker running?")
        print("   Try: docker compose up -d redis")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    clear_cache()
