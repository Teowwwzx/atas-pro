import asyncio
import httpx
import random
import time

BASE_URL = "http://localhost:8000"

async def make_requests():
    async with httpx.AsyncClient() as client:
        print(f"🚀 Starting traffic generation to {BASE_URL}...")
        print("Press Ctrl+C to stop.")
        
        while True:
            # 1. Successful requests (200 OK)
            endpoints = [
                "/api/v1/ping",
                "/api/v1/events", 
                "/",
                "/docs"
            ]
            endpoint = random.choice(endpoints)
            
            try:
                start = time.time()
                response = await client.get(f"{BASE_URL}{endpoint}")
                duration = (time.time() - start) * 1000
                print(f"✅ {response.status_code} {endpoint} ({duration:.2f}ms)")
            except Exception as e:
                print(f"❌ Connection error: {e}")

            # 2. Simulate some 404s (Client Errors)
            if random.random() < 0.2: # 20% chance
                try:
                    await client.get(f"{BASE_URL}/api/v1/non-existent-page-{random.randint(1,100)}")
                    print(f"⚠️ 404 Not Found generated")
                except:
                    pass

            # 3. Sleep a bit to not overwhelm (but enough to show on graph)
            await asyncio.sleep(random.uniform(0.1, 0.5))

if __name__ == "__main__":
    try:
        asyncio.run(make_requests())
    except KeyboardInterrupt:
        print("\n🛑 Stopped traffic generation.")
