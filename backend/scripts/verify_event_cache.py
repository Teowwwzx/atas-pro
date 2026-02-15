import requests
import time
import os

API_URL = "http://localhost:8000/api/v1/events"
HEADERS = {"Content-Type": "application/json"}

def benchmark_events():
    print("🚀 Benchmarking Events API Cache Performance...")
    
    # 1. Benchmark /events (List)
    print("\n[1] Testing GET /events (List)...")
    start_time = time.time()
    resp1 = requests.get(API_URL, headers=HEADERS)
    duration1 = (time.time() - start_time) * 1000
    
    if resp1.status_code == 200:
        print(f"   First Call (Cache Miss): {duration1:.2f} ms | Items: {len(resp1.json())}")
    else:
        print(f"   ❌ Failed: {resp1.status_code}")
        
    start_time = time.time()
    resp2 = requests.get(API_URL, headers=HEADERS)
    duration2 = (time.time() - start_time) * 1000
    
    if resp2.status_code == 200:
        print(f"   Second Call (Cache Hit): {duration2:.2f} ms")
        if duration2 > 0:
            print(f"   ⚡ Speedup: {duration1 / duration2:.1f}x")
    
    # 2. Benchmark /events/count
    print("\n[2] Testing GET /events/count...")
    start_time = time.time()
    resp3 = requests.get(f"{API_URL}/count", headers=HEADERS)
    duration3 = (time.time() - start_time) * 1000
    
    if resp3.status_code == 200:
        print(f"   First Call (Cache Miss): {duration3:.2f} ms | Count: {resp3.json().get('total_count')}")
    else:
        print(f"   ❌ Failed: {resp3.status_code}")
        
    start_time = time.time()
    resp4 = requests.get(f"{API_URL}/count", headers=HEADERS)
    duration4 = (time.time() - start_time) * 1000
    
    if resp4.status_code == 200:
        print(f"   Second Call (Cache Hit): {duration4:.2f} ms")
        if duration4 > 0:
            print(f"   ⚡ Speedup: {duration3 / duration4:.1f}x")

if __name__ == "__main__":
    benchmark_events()
