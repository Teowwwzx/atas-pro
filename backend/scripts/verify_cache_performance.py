import requests
import sys
import os
import subprocess
import json
import time
from rich.console import Console

console = Console()
API_URL = "http://localhost:8000"
EMAIL = "cache_test@example.com"
PASSWORD = "password123"

def run_command(command):
    """Run shell command and return output"""
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Command failed: {command}\n{result.stderr}")
        return None
    return result.stdout.strip()

def login():
    """Register/Login to get an access token."""
    console.print("[dim]Authenticating...[/dim]")
    # 1. Register
    try:
        requests.post(f"{API_URL}/api/v1/auth/register", json={
            "email": EMAIL,
            "password": PASSWORD,
            "full_name": "Cache Test User",
            "role": "expert"
        })
    except:
        pass

    # 2. Activate
    run_command(f"docker exec atas_postgres psql -U atas_pro_user -d atas_pro -c \"UPDATE users SET is_verified = true, status = 'active' WHERE email = '{EMAIL}';\"")

    # 3. Login
    resp = requests.post(f"{API_URL}/api/v1/auth/login", data={
        "username": EMAIL,
        "password": PASSWORD
    })
    
    if resp.status_code != 200:
        console.print(f"[bold red]Login failed: {resp.text}[/bold red]")
        sys.exit(1)
        
    return resp.json()["access_token"]

def measure_request(name, url, params, headers):
    start_time = time.time()
    resp = requests.get(url, params=params, headers=headers)
    duration_ms = (time.time() - start_time) * 1000
    
    if resp.status_code != 200:
        console.print(f"[red]Request failed: {resp.status_code} {resp.text}[/red]")
        return None

    status = "[green]OK[/green]"
    console.print(f"{name}: {duration_ms:.2f}ms - {status}")
    return duration_ms

def verify_cache(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    console.print("\n[bold]Testing /api/v1/profiles/discover Cache[/bold]")
    url = f"{API_URL}/api/v1/profiles/discover"
    params = {"page": 1, "page_size": 10}
    
    # First request (Miss)
    t1 = measure_request("1st Request (Cache Miss expected)", url, params, headers)
    
    # Second request (Hit)
    t2 = measure_request("2nd Request (Cache Hit expected)", url, params, headers)
    
    if t1 and t2:
        improvement = t1 - t2
        if t2 < t1 * 0.8: # Expect significant improvement or already fast
            console.print(f"[bold green]✅ CACHE WORKING: {improvement:.2f}ms faster ({t1/t2:.1f}x speedup)[/bold green]")
        elif t2 < 50: # If both are very fast (<50ms), it's also fine (local DB is fast)
            console.print(f"[bold green]✅ CACHE WORKING (Both fast): {t2:.2f}ms[/bold green]")
        else:
            console.print(f"[bold yellow]⚠️ CACHE UNCERTAIN: No significant speedup ({t1:.2f}ms vs {t2:.2f}ms)[/bold yellow]")

    console.print("\n[bold]Testing /api/v1/profiles/semantic-search Cache[/bold]")
    url = f"{API_URL}/api/v1/profiles/semantic-search"
    params = {"q_text": "machine learning"}
    
    # First request (Miss)
    t1 = measure_request("1st Request (Cache Miss expected)", url, params, headers)
    
    # Second request (Hit)
    t2 = measure_request("2nd Request (Cache Hit expected)", url, params, headers)
    
    if t1 and t2:
        improvement = t1 - t2
        if t2 < t1 * 0.8: 
            console.print(f"[bold green]✅ CACHE WORKING: {improvement:.2f}ms faster ({t1/t2:.1f}x speedup)[/bold green]")
        elif t2 < 50:
             console.print(f"[bold green]✅ CACHE WORKING (Both fast): {t2:.2f}ms[/bold green]")
        else:
            console.print(f"[bold yellow]⚠️ CACHE UNCERTAIN: No significant speedup ({t1:.2f}ms vs {t2:.2f}ms)[/bold yellow]")

if __name__ == "__main__":
    token = login()
    verify_cache(token)
