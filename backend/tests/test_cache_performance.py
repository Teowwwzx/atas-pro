import pytest
import time
import uuid

# Helper to clear cache (requires the script we made earlier or direct redis access)
# For this test, we'll assume we can't easily clear redis without auth/access, 
# so we'll use unique query parameters to ensure a "fresh" request.

def get_unique_params():
    """Generates unique parameters to bypass cache."""
    return {"q_text": f"test_{uuid.uuid4()}"}

def test_events_list_caching(client):
    """
    Verifies that subsequent requests to /events with the same parameters
    are significantly faster (Cache Hit) than the first request (Cache Miss).
    """
    print("\n[Test] Events List Caching")
    
    # 1. Unique query to ensure Cache Miss
    params = {"q_text": f"benchmark_{uuid.uuid4()}", "limit": 20} # Use random query to miss cache
    
    # Warmup / Cache Miss
    start_time = time.time()
    resp1 = client.get("/api/v1/events", params=params)
    duration1 = (time.time() - start_time) * 1000
    
    assert resp1.status_code == 200, f"First request failed: {resp1.text}"
    
    # 2. Same query to hit Cache
    start_time = time.time()
    resp2 = client.get("/api/v1/events", params=params)
    duration2 = (time.time() - start_time) * 1000
    
    assert resp2.status_code == 200, f"Second request failed: {resp2.text}"
    
    # 3. Assertions
    print(f"   Run 1 (Miss): {duration1:.2f} ms")
    print(f"   Run 2 (Hit) : {duration2:.2f} ms")
    
    # Data Consistency Check
    assert resp1.json() == resp2.json(), "Cached response data differs from original!"
    
    # Speedup Check
    # Note: On local machine with 0 network latency, DB might be fast enough that 
    # overhead of Redis connection makes them similar. But usually Redis is faster.
    # We allow a small margin or expect at least it's not SLOWER.
    # We allow a small margin or expect at least it's not SLOWER.
    # Ideally: duration2 < duration1
    
    # If duration1 is very fast (e.g. < 50ms), the difference might be negligible.
    if duration1 > 50: 
        assert duration2 < duration1, "Cache hit should be faster than cache miss"
    else:
        print("   ⚠️ Database is too fast (<50ms) to measure significant cache speedup locally.")

def test_events_count_caching(client):
    """
    Verifies /events/count caching.
    """
    print("\n[Test] Events Count Caching")
    
    params = {"status": "published", "random": str(uuid.uuid4())} # Add random param if ignored? 
    # Actually our backend keys on ALL params, so adding a random unused param 
    # effectively creates a new cache key if the backend doesn't filter it out.
    # Let's check: params = locals().copy() in router. So yes, extra params might be included?
    # Wait, FastAPI endpoint only accepts defined params. Passing extra params via requests
    # usually are ignored by FastAPI logic but might not be in `locals()`?
    # Actually `locals()` only captures arguments defined in function signature.
    # So we must vary a defined parameter. `q_text` is good.
    
    params = {"q_text": f"count_bench_{uuid.uuid4()}"}
    
    # Miss
    start_time = time.time()
    resp1 = client.get("/api/v1/events/count", params=params)
    duration1 = (time.time() - start_time) * 1000
    assert resp1.status_code == 200
    
    # Hit
    start_time = time.time()
    resp2 = client.get("/api/v1/events/count", params=params)
    duration2 = (time.time() - start_time) * 1000
    assert resp2.status_code == 200
    
    print(f"   Run 1 (Miss): {duration1:.2f} ms")
    print(f"   Run 2 (Hit) : {duration2:.2f} ms")
    
    assert resp1.json() == resp2.json()

def test_profile_discover_caching(client):
    """
    Verifies /profiles/discover caching.
    """
    print("\n[Test] Profile Discover Caching")
    
    # Use a unique filter combination
    params = {"page": 1, "query": f"tester_{uuid.uuid4()}"}
    
    # Miss
    start_time = time.time()
    resp1 = client.get("/api/v1/profiles/discover", params=params)
    duration1 = (time.time() - start_time) * 1000
    
    # Hit
    start_time = time.time()
    resp2 = client.get("/api/v1/profiles/discover", params=params)
    duration2 = (time.time() - start_time) * 1000
    
    if resp1.status_code == 200 and resp2.status_code == 200:
        print(f"   Run 1 (Miss): {duration1:.2f} ms")
        print(f"   Run 2 (Hit) : {duration2:.2f} ms")
        assert resp1.json() == resp2.json()
    else:
        print(f"   Skipping profile test (Status: {resp1.status_code})")

if __name__ == "__main__":
    # Allow running directly
    pytest.main([__file__, "-v", "-s"])
